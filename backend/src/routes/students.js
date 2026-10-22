import { Router } from "express";
const router = Router();

/**
 * GET /api/students
 *
 * Admin: list students (hostel-scoped by middleware).
 * The hostel query param is enforced by enforceHostelScope in index.js —
 * boys_admin can only see boys hostel students, etc.
 */
router.get("/", async (req, res, next) => {
  try {
    const { hostel, department, year, search, limit = 50 } = req.query;
    let query = req.supabaseAdmin
      .from("students")
      .select("*, rooms(room_number)")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (hostel) query = query.eq("hostel", hostel);
    if (department) query = query.eq("department", department);
    if (year) query = query.eq("year", year);
    if (search) query = query.ilike("full_name", `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/students/:id
 *
 * Admin: get a single student. Validates hostel scope.
 */
router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("students")
      .select("*, rooms(room_number)")
      .eq("id", req.params.id)
      .single();
    if (error) throw error;

    // Enforce hostel scope — admin can only view students in their hostel
    if (req.hostelScope && data.hostel !== req.hostelScope) {
      return res.status(403).json({
        error: { message: "You do not have access to this student's records." },
      });
    }

    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/students
 *
 * Admin: create a student record. Enforces hostel scope.
 */
router.post("/", async (req, res, next) => {
  try {
    const body = { ...req.body };

    // Enforce hostel scope for non-super admins
    if (req.hostelScope) {
      body.hostel = req.hostelScope;
    }

    const { data, error } = await req.supabaseAdmin
      .from("students")
      .insert(body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/students/:id
 *
 * Admin: update a student. Validates hostel scope.
 */
router.patch("/:id", async (req, res, next) => {
  try {
    // Verify the student belongs to admin's hostel scope
    if (req.hostelScope) {
      const { data: existing } = await req.supabaseAdmin
        .from("students")
        .select("hostel")
        .eq("id", req.params.id)
        .single();
      if (existing && existing.hostel !== req.hostelScope) {
        return res.status(403).json({
          error: { message: "You do not have access to this student's records." },
        });
      }
      // Prevent changing hostel assignment to a different hostel
      if (req.body.hostel && req.body.hostel !== req.hostelScope) {
        return res.status(403).json({
          error: { message: "You cannot transfer students to another hostel." },
        });
      }
    }

    const { data, error } = await req.supabaseAdmin
      .from("students")
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

/**
 * DELETE /api/students/:id
 *
 * Admin: remove a student. Validates hostel scope.
 */
router.delete("/:id", async (req, res, next) => {
  try {
    // Verify hostel scope before deletion
    if (req.hostelScope) {
      const { data: existing } = await req.supabaseAdmin
        .from("students")
        .select("hostel")
        .eq("id", req.params.id)
        .single();
      if (existing && existing.hostel !== req.hostelScope) {
        return res.status(403).json({
          error: { message: "You do not have access to this student's records." },
        });
      }
    }

    const { error } = await req.supabaseAdmin
      .from("students")
      .delete()
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
