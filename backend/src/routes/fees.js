import { Router } from "express";
import { requireAdmin } from "../middleware/authorize.js";
const router = Router();

/**
 * GET /api/fees
 *
 * Admin: list fee records (hostel-scoped by middleware).
 * Student: list only their own fee records (enforced by auth_id).
 */
router.get("/", async (req, res, next) => {
  try {
    const { student_id, status, fee_type, limit = 50 } = req.query;
    let query = req.supabaseAdmin
      .from("fees")
      .select("*, students(full_name, usn)")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    // Students can only see their own fees
    if (req.role === "student") {
      // Look up the student's record by auth_id
      const { data: studentRec } = await req.supabaseAdmin
        .from("students")
        .select("id")
        .eq("auth_id", req.userId)
        .maybeSingle();
      if (studentRec) {
        query = query.eq("student_id", studentRec.id);
      } else {
        // No linked student record — return empty
        return res.json({ data: [] });
      }
    } else {
      // Admin filters
      if (student_id) query = query.eq("student_id", student_id);
    }

    if (status) query = query.eq("status", status);
    if (fee_type) query = query.eq("fee_type", fee_type);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** POST /api/fees — admin only */
router.post("/", requireAdmin, async (req, res, next) => {
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

/** PATCH /api/fees/:id — admin only */
router.patch("/:id", requireAdmin, async (req, res, next) => {
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
