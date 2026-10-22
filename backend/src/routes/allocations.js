import { Router } from "express";
const router = Router();

/**
 * POST /api/allocations
 *
 * Admin only (enforced at index.js level). Hostel scope validated here.
 */
router.post("/", async (req, res, next) => {
  try {
    const { student_id, room_id } = req.body;

    // Validate hostel scope — ensure student belongs to admin's hostel
    if (req.hostelScope) {
      const { data: student } = await req.supabaseAdmin
        .from("students")
        .select("hostel")
        .eq("id", student_id)
        .single();
      if (student && student.hostel !== req.hostelScope) {
        return res.status(403).json({
          error: { message: "You do not have access to this student's hostel." },
        });
      }
    }

    const { data, error } = await req.supabaseAdmin
      .from("allocations")
      .insert({ student_id, room_id })
      .select()
      .single();
    if (error) throw error;

    // Update the student's room_id
    await req.supabaseAdmin
      .from("students")
      .update({ room_id })
      .eq("id", student_id);

    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/allocations/:id
 *
 * Admin only. Validates hostel scope.
 */
router.delete("/:id", async (req, res, next) => {
  try {
    // Get allocation to find student
    const { data: allocation, error: fetchErr } = await req.supabaseAdmin
      .from("allocations")
      .select("student_id")
      .eq("id", req.params.id)
      .single();
    if (fetchErr) throw fetchErr;

    // Validate hostel scope
    if (req.hostelScope && allocation?.student_id) {
      const { data: student } = await req.supabaseAdmin
        .from("students")
        .select("hostel")
        .eq("id", allocation.student_id)
        .single();
      if (student && student.hostel !== req.hostelScope) {
        return res.status(403).json({
          error: { message: "You do not have access to this student's hostel." },
        });
      }
    }

    const { error } = await req.supabaseAdmin
      .from("allocations")
      .delete()
      .eq("id", req.params.id);
    if (error) throw error;

    // Clear the student's room_id
    if (allocation?.student_id) {
      await req.supabaseAdmin
        .from("students")
        .update({ room_id: null })
        .eq("id", allocation.student_id);
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
