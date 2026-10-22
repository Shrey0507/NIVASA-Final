import { Router } from "express";
const router = Router();

/** GET /api/fees */
router.get("/", async (req, res, next) => {
  try {
    const { student_id, status, fee_type, limit = 50 } = req.query;
    let query = req.supabaseAdmin
      .from("fees")
      .select("*, students(full_name, usn)")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (student_id) query = query.eq("student_id", student_id);
    if (status) query = query.eq("status", status);
    if (fee_type) query = query.eq("fee_type", fee_type);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** POST /api/fees */
router.post("/", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("fees")
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/fees/:id */
router.patch("/:id", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("fees")
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
