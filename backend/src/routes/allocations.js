import { Router } from "express";
const router = Router();

const fail = (res, status, message) =>
  res.status(status).json({ error: { message } });

/** List the students currently assigned to a room (or all rooms in a hostel). */
router.get("/", async (req, res, next) => {
  try {
    const { room_id, hostel } = req.query;
    let query = req.supabaseAdmin
      .from("allocations")
      .select("id, student_id, room_id, allocated_at, students(id, full_name, usn, email, hostel, room_id)")
      .is("deallocated_at", null)
      .order("allocated_at", { ascending: false });

    if (room_id) query = query.eq("room_id", room_id);

    const { data, error } = await query;
    if (error) throw error;

    let rows = data || [];
    if (req.hostelScope) {
      rows = rows.filter((a) => a.students?.hostel === req.hostelScope);
    } else if (hostel) {
      rows = rows.filter((a) => a.students?.hostel === hostel);
    }
    res.json({ data: rows });
  } catch (err) {
    next(err);
  }
});

/** Assign a student to a room. */
router.post("/", async (req, res, next) => {
  let insertedAllocationId = null;
  let studentWasLinked = false;
  try {
    const { student_id, room_id } = req.body || {};
    if (!student_id || !room_id) {
      return fail(res, 400, "Select a student and a room.");
    }

    const admin = req.supabaseAdmin;
    const [{ data: student, error: studentError }, { data: room, error: roomError }] =
      await Promise.all([
        admin.from("students").select("id, hostel, room_id, full_name").eq("id", student_id).maybeSingle(),
        admin.from("rooms").select("id, hostel, capacity, occupied, status, room_number").eq("id", room_id).maybeSingle(),
      ]);
    if (studentError) throw studentError;
    if (roomError) throw roomError;
    if (!student) return fail(res, 404, "Student record not found.");
    if (!room) return fail(res, 404, "Room not found.");

    if (req.hostelScope && (student.hostel !== req.hostelScope || room.hostel !== req.hostelScope)) {
      return fail(res, 403, "You can only assign students and rooms within your hostel.");
    }
    if (student.hostel !== room.hostel) {
      return fail(res, 409, "The student and room must belong to the same hostel.");
    }
    if (student.room_id) {
      return fail(res, 409, "This student already has a room. Deallocate the current room before moving them.");
    }
    if (room.status === "maintenance") {
      return fail(res, 409, "This room is under maintenance and cannot receive students.");
    }

    const { count, error: countError } = await admin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("room_id", room_id);
    if (countError) throw countError;
    if ((count || 0) >= Number(room.capacity)) {
      return fail(res, 409, "This room is full. Choose a room with available beds.");
    }

    // Prevent duplicate active allocation records for the same student.
    const { data: existing, error: existingError } = await admin
      .from("allocations")
      .select("id")
      .eq("student_id", student_id)
      .is("deallocated_at", null)
      .limit(1);
    if (existingError) throw existingError;
    if (existing?.length) {
      return fail(res, 409, "This student already has an active room allocation.");
    }

    const { data: allocation, error: allocationError } = await admin
      .from("allocations")
      .insert({ student_id, room_id })
      .select()
      .single();
    if (allocationError) throw allocationError;
    insertedAllocationId = allocation.id;

    const { data: linkedStudent, error: studentUpdateError } = await admin
      .from("students")
      .update({ room_id })
      .eq("id", student_id)
      .is("room_id", null)
      .select("id")
      .maybeSingle();
    if (studentUpdateError) throw studentUpdateError;
    if (!linkedStudent) {
      await admin.from("allocations").delete().eq("id", insertedAllocationId);
      insertedAllocationId = null;
      return fail(res, 409, "This student was assigned to another room just now. Refresh and try again.");
    }
    studentWasLinked = true;

    const newOccupied = (count || 0) + 1;
    const { error: roomUpdateError } = await admin
      .from("rooms")
      .update({
        occupied: newOccupied,
        status: newOccupied >= Number(room.capacity) ? "full" : "available",
      })
      .eq("id", room_id);
    if (roomUpdateError) throw roomUpdateError;

    res.status(201).json({ data: allocation, success: true });
  } catch (err) {
    // Compensate if a later write fails, so a half-created allocation is not left behind.
    if (studentWasLinked) {
      await req.supabaseAdmin.from("students").update({ room_id: null }).eq("id", req.body?.student_id).eq("room_id", req.body?.room_id);
    }
    if (insertedAllocationId) {
      await req.supabaseAdmin.from("allocations").delete().eq("id", insertedAllocationId);
    }
    next(err);
  }
});

/** Deallocate a student and make the bed available again. */
router.delete("/:id", async (req, res, next) => {
  try {
    const admin = req.supabaseAdmin;
    const { data: allocation, error: fetchError } = await admin
      .from("allocations")
      .select("id, student_id, room_id, students(hostel)")
      .eq("id", req.params.id)
      .maybeSingle();
    if (fetchError) throw fetchError;
    if (!allocation) return fail(res, 404, "Room allocation not found.");

    if (req.hostelScope && allocation.students?.hostel !== req.hostelScope) {
      return fail(res, 403, "You do not have access to this student's hostel.");
    }

    const { error: studentError } = await admin
      .from("students")
      .update({ room_id: null })
      .eq("id", allocation.student_id)
      .eq("room_id", allocation.room_id);
    if (studentError) throw studentError;

    const { error: deleteError } = await admin
      .from("allocations")
      .delete()
      .eq("id", allocation.id);
    if (deleteError) {
      // Restore the student link if allocation deletion failed.
      await admin.from("students").update({ room_id: allocation.room_id }).eq("id", allocation.student_id);
      throw deleteError;
    }

    const { count, error: countError } = await admin
      .from("students")
      .select("id", { count: "exact", head: true })
      .eq("room_id", allocation.room_id);
    if (countError) throw countError;

    const { data: room, error: roomError } = await admin
      .from("rooms").select("capacity, status").eq("id", allocation.room_id).maybeSingle();
    if (roomError) throw roomError;
    if (room && room.status !== "maintenance") {
      await admin.from("rooms").update({
        occupied: count || 0,
        status: (count || 0) >= Number(room.capacity) ? "full" : "available",
      }).eq("id", allocation.room_id);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
