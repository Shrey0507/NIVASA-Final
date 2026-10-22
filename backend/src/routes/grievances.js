import { Router } from "express";
const router = Router();

/** GET /api/grievances */
router.get("/", async (req, res, next) => {
  try {
    const { student_id, status, category, limit = 50 } = req.query;
    let query = req.supabaseAdmin
      .from("grievances")
      .select("*, students(full_name, usn)")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (student_id) query = query.eq("student_id", student_id);
    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** POST /api/grievances */
router.post("/", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("grievances")
      .insert({
        ...req.body,
        student_id: req.body.student_id || req.userId,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/grievances/:id */
router.patch("/:id", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("grievances")
      .update(req.body)
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
