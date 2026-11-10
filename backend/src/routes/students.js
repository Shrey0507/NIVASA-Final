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

    const admin = req.supabaseAdmin;
    const password = typeof body.password === "string" ? body.password : "";
    delete body.password;

    // Backward-compatible: without a password, keep creating a student
    // record exactly as before. Supplying a password provisions a login too.
    let authUser = null;
    if (password) {
      if (!body.email || !String(body.email).includes("@")) {
        return res.status(400).json({ error: { message: "A valid student email is required to create login credentials." } });
      }
      if (password.length < 8) {
        return res.status(400).json({ error: { message: "Student password must be at least 8 characters." } });
      }

      const { data: created, error: createAuthError } = await admin.auth.admin.createUser({
        email: String(body.email).trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: { full_name: body.full_name || body.fullName || "" },
        app_metadata: { role: "student" },
      });
      if (createAuthError) throw createAuthError;
      authUser = created.user;
      body.auth_id = authUser.id;
    }

    try {
      const { data, error } = await admin
        .from("students")
        .insert(body)
        .select()
        .single();
      if (error) throw error;
      res.status(201).json({ data, credentials_created: Boolean(authUser) });
    } catch (insertError) {
      // Avoid leaving an orphan Auth account if the student insert fails.
      if (authUser?.id) await admin.auth.admin.deleteUser(authUser.id);
      throw insertError;
    }
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
    const admin = req.supabaseAdmin;

    // Load the row first so we can enforce scope and remove its linked login.
    const { data: student, error: lookupError } = await admin
      .from("students")
      .select("id, auth_id, hostel, email")
      .eq("id", req.params.id)
      .maybeSingle();
    if (lookupError) throw lookupError;
    if (!student) {
      return res.status(404).json({ error: { message: "Student record not found." } });
    }

    if (req.hostelScope && student.hostel !== req.hostelScope) {
      return res.status(403).json({
        error: { message: "You do not have access to this student's records." },
      });
    }

    // A Students-page removal must remove the matching Credentials login too.
    // Never delete an account unless its trusted role is actually student.
    if (student.auth_id) {
      const { data: authResult, error: authLookupError } =
        await admin.auth.admin.getUserById(student.auth_id);
      if (authLookupError) throw authLookupError;

      const authUser = authResult.user;
      const linkedRole = authUser.app_metadata?.role || authUser.user_metadata?.role;
      if (linkedRole && linkedRole !== "student") {
        return res.status(409).json({
          error: { message: "This student record is linked to a non-student login. The account was not deleted." },
        });
      }

      const { error: authDeleteError } =
        await admin.auth.admin.deleteUser(student.auth_id);
      if (authDeleteError) throw authDeleteError;
    }

    // Delete the student row after Auth deletion (auth_id FK may be SET NULL).
    const { error: studentDeleteError } = await admin
      .from("students")
      .delete()
      .eq("id", student.id);
    if (studentDeleteError) {
      console.error("[STUDENT_DELETE_PARTIAL]", {
        studentId: student.id,
        authId: student.auth_id,
        message: studentDeleteError.message,
      });
      return res.status(500).json({
        error: {
          message: student.auth_id
            ? "The linked login was deleted, but the student record could not be removed. Contact the administrator to finish cleanup."
            : "The student record could not be removed.",
        },
      });
    }

    res.json({
      success: true,
      deleted: true,
      linked_account_deleted: Boolean(student.auth_id),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
