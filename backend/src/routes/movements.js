import { Router } from "express";
import { requireAdmin } from "../middleware/authorize.js";
const router = Router();
const ADMIN = ["super_admin", "boys_admin", "girls_admin"];

async function studentFor(req) {
  const { data, error } = await req.supabaseAdmin.from("students").select("id,hostel,room_number,full_name,usn").eq("auth_id", req.userId).maybeSingle();
  if (error) throw error;
  return data;
}
function isAdmin(req) { return ADMIN.includes(req.role); }

router.get("/", async (req, res, next) => {
  try {
    const { student_id, status, movement_type, limit = 100 } = req.query;
    let query = req.supabaseAdmin.from("movements").select("*, students(full_name, usn, room_number)").order("created_at", { ascending: false }).limit(Math.min(Number(limit) || 100, 200));
    if (req.role === "student") {
      const student = await studentFor(req);
      if (!student) return res.json({ data: [] });
      query = query.eq("student_id", student.id);
    } else {
      if (student_id) query = query.eq("student_id", student_id);
      if (req.hostelScope) query = query.eq("hostel", req.hostelScope);
      else if (req.query.hostel) query = query.eq("hostel", req.query.hostel);
    }
    if (status) query = query.eq("status", status);
    if (movement_type) query = query.eq("movement_type", movement_type);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
});

// Student submissions are requests, not live gate exits. Admin-created records remain direct register entries.
router.post("/", async (req, res, next) => {
  try {
    let studentId = req.body.student_id;
    let payload = { ...req.body };
    if (req.role === "student") {
      const student = await studentFor(req);
      if (!student) return res.status(400).json({ error: { message: "No student record linked to this account." } });
      if (!["exit", "entry"].includes(payload.movement_type)) return res.status(400).json({ error: { message: "Choose a valid movement type." } });
      if (!payload.reason?.trim()) return res.status(400).json({ error: { message: "Please enter a reason for the request." } });
      if (!payload.expected_return_time || !Number.isFinite(Date.parse(payload.expected_return_time)) || Date.parse(payload.expected_return_time) <= Date.now()) {
        return res.status(400).json({ error: { message: "Choose an expected return date and time in the future." } });
      }
      studentId = student.id;
      payload = {
        movement_type: payload.movement_type,
        reason: payload.reason.trim(),
        destination: typeof payload.destination === "string" ? payload.destination.trim() : "",
        expected_return_time: payload.expected_return_time,
        student_id: student.id,
        student_name: student.full_name,
        usn: student.usn,
        room: student.room_number,
        hostel: student.hostel,
        status: "pending",
      };
    } else {
      payload.status = payload.status || "out";
      payload.student_id = studentId || null;
      if (req.hostelScope) payload.hostel = req.hostelScope;
    }
    const { data, error } = await req.supabaseAdmin.from("movements").insert(payload).select("*, students(full_name,usn,room_number)").single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) { next(err); }
});

// Admin decision: approve request and activate it in the movement register.
router.post("/:id/approve", requireAdmin, async (req, res, next) => {
  try {
    const { data: current, error: readError } = await req.supabaseAdmin.from("movements").select("id,status,hostel").eq("id", req.params.id).maybeSingle();
    if (readError) throw readError;
    if (!current) return res.status(404).json({ error: { message: "Movement request not found." } });
    if (req.hostelScope && current.hostel !== req.hostelScope) return res.status(403).json({ error: { message: "This request belongs to another hostel." } });
    if (current.status !== "pending") return res.status(409).json({ error: { message: "Only pending requests can be approved." } });
    const { data, error } = await req.supabaseAdmin.from("movements").update({ status: "approved", approved_at: new Date().toISOString(), approved_by: req.userId, remarks: req.body.remarks || null, updated_at: new Date().toISOString() }).eq("id", req.params.id).select("*, students(full_name,usn,room_number)").single();
    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
});

router.post("/:id/reject", requireAdmin, async (req, res, next) => {
  try {
    const { data: current, error: readError } = await req.supabaseAdmin.from("movements").select("id,status,hostel").eq("id", req.params.id).maybeSingle();
    if (readError) throw readError;
    if (!current) return res.status(404).json({ error: { message: "Movement request not found." } });
    if (req.hostelScope && current.hostel !== req.hostelScope) return res.status(403).json({ error: { message: "This request belongs to another hostel." } });
    if (current.status !== "pending") return res.status(409).json({ error: { message: "Only pending requests can be rejected." } });
    const { data, error } = await req.supabaseAdmin.from("movements").update({ status: "rejected", rejected_at: new Date().toISOString(), rejected_by: req.userId, remarks: req.body.remarks || null, updated_at: new Date().toISOString() }).eq("id", req.params.id).select("*, students(full_name,usn,room_number)").single();
    if (error) throw error;
    res.json({ data });
  } catch (err) { next(err); }
});

// Cancel a pending request. Approved/out movements are closed via the return action.
router.post("/:id/cancel", async (req, res, next) => {
  try {
    const student = req.role === "student" ? await studentFor(req) : null;
    let q = req.supabaseAdmin.from("movements").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", req.params.id).eq("status", "pending");
    if (req.role === "student") {
      if (!student) return res.status(403).json({ error: { message: "Student record not found." } });
      q = q.eq("student_id", student.id);
    } else if (req.hostelScope) q = q.eq("hostel", req.hostelScope);
    const { data, error } = await q.select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ error: { message: "Only your own pending request can be cancelled." } });
    res.json({ data });
  } catch (err) { next(err); }
});

// Mark an approved/out movement as returned.
router.post("/:id/return", async (req, res, next) => {
  try {
    const student = req.role === "student" ? await studentFor(req) : null;
    let q = req.supabaseAdmin.from("movements").update({ status: "returned", actual_return_time: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", req.params.id).in("status", ["approved", "out"]);
    if (req.role === "student") {
      if (!student) return res.status(403).json({ error: { message: "Student record not found." } });
      q = q.eq("student_id", student.id);
    } else if (req.hostelScope) q = q.eq("hostel", req.hostelScope);
    const { data, error } = await q.select().maybeSingle();
    if (error) throw error;
    if (!data) return res.status(409).json({ error: { message: "Only an approved or active movement can be marked returned." } });
    res.json({ data });
  } catch (err) { next(err); }
});
export default router;
