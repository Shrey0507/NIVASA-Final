/**
 * Account management routes — /api/accounts/*
 *
 * All routes require admin role (enforced at the router level in index.js).
 * Additional per-route restrictions are applied here:
 *  - Listing accounts: any admin
 *  - Creating student accounts: any admin (scoped to their hostel)
 *  - Creating admin accounts: super_admin only
 *  - Resend invite / deactivate: super_admin only
 */
import { Router } from "express";
import { requireSuperAdmin } from "../middleware/authorize.js";

const router = Router();

/** GET /api/accounts — list all managed accounts */
router.get("/", async (req, res, next) => {
  try {
    // Use Supabase Auth admin API to list users
    const { data, error } = await req.supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });
    if (error) throw error;

    // Map to safe output — never expose tokens/secrets
    const accounts = (data?.users || []).map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || u.email,
      username: u.user_metadata?.usn || u.user_metadata?.username || null,
      role: u.app_metadata?.role || u.user_metadata?.role || "unknown",
      hostel: u.app_metadata?.hostel || null,
      status: u.banned_until ? "deactivated" : "active",
      created_at: u.created_at,
    }));

    res.json({ data: accounts });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/accounts/students — create a student account via Supabase Auth.
 *
 * Hostel-scoped admins can only create students for their own hostel.
 */
router.post("/students", async (req, res, next) => {
  let createdUserId = null;
  try {
    const { email, password, full_name, usn, hostel, phone, department, year } = req.body;
    if (!email || !full_name || !usn || !password) {
      return res.status(400).json({
        error: { message: "Full name, email, student ID / USN, and password are required." },
      });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: { message: "Password must be at least 8 characters." } });
    }

    const targetHostel = hostel || "boys";
    if (!["boys", "girls"].includes(targetHostel)) {
      return res.status(400).json({ error: { message: "Choose a valid hostel." } });
    }
    if (req.hostelScope && req.hostelScope !== targetHostel) {
      return res.status(403).json({
        error: { message: `You can only create students for the ${req.hostelScope} hostel.` },
      });
    }

    const admin = req.supabaseAdmin;
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedUsn = String(usn).trim().toUpperCase();

    const { data: existingStudent, error: lookupError } = await admin
      .from("students").select("id").ilike("usn", normalizedUsn).maybeSingle();
    if (lookupError) throw lookupError;
    if (existingStudent) {
      return res.status(409).json({ error: { message: "A student with this ID / USN already exists." } });
    }

    const { data: authResult, error: authError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name, usn: normalizedUsn, username: req.body.username || normalizedUsn },
      app_metadata: { role: "student", hostel: targetHostel },
    });
    if (authError) throw authError;
    createdUserId = authResult.user.id;

    const { data: student, error: studentError } = await admin
      .from("students")
      .insert({
        auth_id: createdUserId,
        full_name: String(full_name).trim(),
        usn: normalizedUsn,
        email: normalizedEmail,
        hostel: targetHostel,
        phone: phone || null,
        department: department || null,
        year: year == null ? null : String(year),
        status: "active",
      })
      .select()
      .single();

    if (studentError) throw studentError;

    res.status(201).json({
      account: {
        id: createdUserId,
        email: normalizedEmail,
        full_name,
        username: normalizedUsn,
        role: "student",
        hostel: targetHostel,
        status: "active",
      },
      student,
    });
  } catch (err) {
    // Roll back Auth creation if the student record could not be linked.
    if (createdUserId) {
      const { error: rollbackError } = await req.supabaseAdmin.auth.admin.deleteUser(createdUserId);
      if (rollbackError) console.error("[ACCOUNT_ROLLBACK_FAILED]", rollbackError);
    }
    next(err);
  }
});

/**
 * POST /api/accounts/admins — create an admin account.
 *
 * SUPER_ADMIN ONLY. Accepts a `role` field that must be one of:
 * boys_admin, girls_admin. Only super_admin can create another super_admin.
 */
router.post("/admins", requireSuperAdmin, async (req, res, next) => {
  try {
    const { email, password, full_name, role, hostel } = req.body;
    if (!email || !full_name) {
      return res.status(400).json({
        error: { message: "Email and full_name are required." },
      });
    }

    // Validate the target role
    const validRoles = ["boys_admin", "girls_admin", "super_admin"];
    const targetRole = role || (hostel === "girls" ? "girls_admin" : "boys_admin");
    if (!validRoles.includes(targetRole)) {
      return res.status(400).json({
        error: { message: `Invalid admin role. Must be one of: ${validRoles.join(", ")}` },
      });
    }

    const admin = req.supabaseAdmin;

    const { data: authUser, error: authErr } =
      await admin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password: password || undefined,
        email_confirm: true,
        user_metadata: { full_name },
        app_metadata: { role: targetRole },
      });
    if (authErr) throw authErr;

    res.status(201).json({ account: authUser.user });
  } catch (err) {
    next(err);
  }
});

/** POST /api/accounts/:id/resend-invite — SUPER_ADMIN ONLY */
router.post("/:id/resend-invite", requireSuperAdmin, async (req, res, next) => {
  try {
    const { data: user, error: fetchErr } =
      await req.supabaseAdmin.auth.admin.getUserById(req.params.id);
    if (fetchErr) throw fetchErr;

    const { error } =
      await req.supabaseAdmin.auth.admin.inviteUserByEmail(user.user.email);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/** POST /api/accounts/:id/deactivate — SUPER_ADMIN ONLY */
router.post("/:id/deactivate", requireSuperAdmin, async (req, res, next) => {
  try {
    // Prevent self-deactivation
    if (req.params.id === req.userId) {
      return res.status(400).json({
        error: { message: "You cannot deactivate your own account." },
      });
    }

    const { error } = await req.supabaseAdmin.auth.admin.updateUserById(
      req.params.id,
      { ban_duration: "876000h" } // ~100 years
    );
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/accounts/:id/role — change a user's role. SUPER_ADMIN ONLY.
 */
router.patch("/:id/role", requireSuperAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ["super_admin", "boys_admin", "girls_admin", "student"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: { message: `Invalid role. Must be one of: ${validRoles.join(", ")}` },
      });
    }

    // Prevent self-demotion
    if (req.params.id === req.userId && role !== "super_admin") {
      return res.status(400).json({
        error: { message: "You cannot demote your own super_admin account." },
      });
    }

    const { data: existing, error: fetchErr } =
      await req.supabaseAdmin.auth.admin.getUserById(req.params.id);
    if (fetchErr) throw fetchErr;

    const { error } = await req.supabaseAdmin.auth.admin.updateUserById(
      req.params.id,
      {
        app_metadata: { ...existing.user.app_metadata, role },
      }
    );
    if (error) throw error;

    res.json({ success: true, role });
  } catch (err) {
    next(err);
  }
});

export default router;
