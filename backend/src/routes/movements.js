import { Router } from "express";
const router = Router();

/** GET /api/movements */
router.get("/", async (req, res, next) => {
  try {
    const { student_id, status, movement_type, limit = 50 } = req.query;
    let query = req.supabaseAdmin
      .from("movements")
      .select("*, students(full_name, usn)")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (student_id) query = query.eq("student_id", student_id);
    if (status) query = query.eq("status", status);
    if (movement_type) query = query.eq("movement_type", movement_type);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** POST /api/movements */
router.post("/", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("movements")
      .insert({ ...req.body, student_id: req.body.student_id || req.userId })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

/** POST /api/movements/:id/return — marks a movement as returned */
router.post("/:id/return", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("movements")
      .update({
        status: "returned",
        actual_return_time: new Date().toISOString(),
      })
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
