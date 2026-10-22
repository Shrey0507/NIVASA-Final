import { Router } from "express";
import { requireAdmin } from "../middleware/authorize.js";
const router = Router();

/**
 * GET /api/grievances
 *
 * Admin: list all grievances (hostel-scoped).
 * Student: list only their own grievances.
 */
router.get("/", async (req, res, next) => {
  try {
    const { student_id, status, category, limit = 50 } = req.query;
    let query = req.supabaseAdmin
      .from("grievances")
      .select("*, students(full_name, usn)")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (req.role === "student") {
      const { data: studentRec } = await req.supabaseAdmin
        .from("students")
        .select("id")
        .eq("auth_id", req.userId)
        .maybeSingle();
      if (studentRec) {
        query = query.eq("student_id", studentRec.id);
      } else {
        return res.json({ data: [] });
      }
    } else {
      if (student_id) query = query.eq("student_id", student_id);
    }

    if (status) query = query.eq("status", status);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/grievances
 *
 * Both admins and students can create grievances.
 * Students: student_id is set from their authenticated identity.
 */
router.post("/", async (req, res, next) => {
  try {
    let studentId = req.body.student_id;

    if (req.role === "student") {
      const { data: studentRec } = await req.supabaseAdmin
        .from("students")
        .select("id")
        .eq("auth_id", req.userId)
        .maybeSingle();
      if (!studentRec) {
        return res.status(400).json({
          error: { message: "No student record linked to this account." },
        });
      }
      studentId = studentRec.id;
    }

    const { data, error } = await req.supabaseAdmin
      .from("grievances")
      .insert({
        ...req.body,
        student_id: studentId,
      })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/grievances/:id — admin only (update status/response) */
router.patch("/:id", requireAdmin, async (req, res, next) => {
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
