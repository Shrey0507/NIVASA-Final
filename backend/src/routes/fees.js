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
    const { student_id, status, limit = 50 } = req.query;
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

    query = query.eq("fee_type", "Hostel Fee");
    if (status) query = query.eq("status", status);

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
    const studentId = String(req.body?.student_id || "");
    const amount = Number(req.body?.amount);
    if (!studentId || !Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ error: { message: "Select an existing student and enter a valid hostel fee amount." } });
    }
    const { data: student, error: studentError } = await req.supabaseAdmin
      .from("students").select("id, hostel").eq("id", studentId).maybeSingle();
    if (studentError) throw studentError;
    if (!student) return res.status(404).json({ error: { message: "The selected student does not exist." } });
    if (req.hostelScope && student.hostel !== req.hostelScope) return res.status(403).json({ error: { message: "You cannot add fees for students in another hostel." } });
    const feePayload = {
      student_id: student.id,
      amount,
      paid_amount: 0,
      fee_type: "Hostel Fee",
      due_date: req.body.due_date || null,
      term: req.body.term || null,
      status: "pending",
    };
    const { data, error } = await req.supabaseAdmin
      .from("fees")
      .insert(feePayload)
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
