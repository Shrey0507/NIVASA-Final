import { Router } from "express";
import { requireAdmin } from "../middleware/authorize.js";
const router = Router();

/**
 * GET /api/notices
 *
 * Both admins and students can read notices.
 * No hostel-scoping on notices — they're typically institution-wide.
 */
router.get("/", async (req, res, next) => {
  try {
    const { audience, limit = 50 } = req.query;
    let query = req.supabaseAdmin
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (audience) query = query.eq("audience", audience);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** POST /api/notices — admin only */
router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("notices")
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/notices/:id — admin only */
router.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("notices")
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

/** DELETE /api/notices/:id — admin only */
router.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const { error } = await req.supabaseAdmin
      .from("notices")
      .delete()
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
