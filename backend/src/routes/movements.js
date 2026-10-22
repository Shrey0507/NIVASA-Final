import { Router } from "express";
import { requireAdmin } from "../middleware/authorize.js";
const router = Router();

/**
 * GET /api/movements
 *
 * Admin: list all movement records (hostel-scoped).
 * Student: list only their own movement records.
 */
router.get("/", async (req, res, next) => {
  try {
    const { student_id, status, movement_type, limit = 50 } = req.query;
    let query = req.supabaseAdmin
      .from("movements")
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
    if (movement_type) query = query.eq("movement_type", movement_type);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/movements
 *
 * Both admins and students can create movements.
 * Students: student_id is automatically set from their auth_id.
 */
router.post("/", async (req, res, next) => {
  try {
    let studentId = req.body.student_id;

    if (req.role === "student") {
      // Force the student_id to be the authenticated student's ID
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
      .from("movements")
      .insert({ ...req.body, student_id: studentId })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/movements/:id/return — marks a movement as returned.
 *
 * Admin: can mark any movement in their scope.
 * Student: can only mark their own movements.
 */
router.post("/:id/return", async (req, res, next) => {
  try {
    // If student, verify ownership
    if (req.role === "student") {
      const { data: studentRec } = await req.supabaseAdmin
        .from("students")
        .select("id")
        .eq("auth_id", req.userId)
        .maybeSingle();
      const { data: movement } = await req.supabaseAdmin
        .from("movements")
        .select("student_id")
        .eq("id", req.params.id)
        .single();
      if (!studentRec || !movement || movement.student_id !== studentRec.id) {
        return res.status(403).json({
          error: { message: "You can only update your own movement records." },
        });
      }
    }

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
