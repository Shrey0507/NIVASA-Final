import { Router } from "express";
const router = Router();

/** GET /api/mess */
router.get("/", async (req, res, next) => {
  try {
    const { limit = 100 } = req.query;
    const { data, error } = await req.supabaseAdmin
      .from("mess")
      .select("*")
      .order("day", { ascending: true })
      .limit(Number(limit));
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** POST /api/mess */
router.post("/", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("mess")
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/mess/:id */
router.patch("/:id", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("mess")
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
