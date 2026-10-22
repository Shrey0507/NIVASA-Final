import { Router } from "express";
const router = Router();

/** POST /api/allocations */
router.post("/", async (req, res, next) => {
  try {
    const { student_id, room_id } = req.body;
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

/** DELETE /api/allocations/:id */
router.delete("/:id", async (req, res, next) => {
  try {
    // Get allocation to find student
    const { data: allocation, error: fetchErr } = await req.supabaseAdmin
      .from("allocations")
      .select("student_id")
      .eq("id", req.params.id)
      .single();
    if (fetchErr) throw fetchErr;

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
