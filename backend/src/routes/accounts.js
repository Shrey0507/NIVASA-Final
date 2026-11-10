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
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(100, Math.max(1, Number.parseInt(req.query.perPage, 10) || 25));
    const search = String(req.query.search || "").trim().toLowerCase();
    const roleFilter = String(req.query.role || "").trim();
    const statusFilter = String(req.query.status || "").trim();
    const admin = req.supabaseAdmin;

    // Search/filter across all Auth pages so a user is discoverable even
    // when they are not on the currently displayed page.
    const users = [];
    if (search || roleFilter || statusFilter || req.hostelScope) {
      let authPage = 1;
      while (authPage <= 100) {
        const { data, error } = await admin.auth.admin.listUsers({ page: authPage, perPage: 100 });
        if (error) throw error;
        users.push(...(data?.users || []));
        if (!data?.nextPage || !(data?.users || []).length) break;
        authPage += 1;
      }
    } else {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) throw error;
      users.push(...(data?.users || []));
    }

    let accounts = users.map((u) => ({
      id: u.id,
      email: u.email,
      full_name: u.user_metadata?.full_name || u.email,
      username: u.user_metadata?.usn || u.user_metadata?.username || null,
      role: u.app_metadata?.role || u.user_metadata?.role || "unknown",
      hostel: u.app_metadata?.hostel || null,
      status: u.banned_until ? "deactivated" : "active",
      created_at: u.created_at,
    }));

    if (req.hostelScope) {
      accounts = accounts.filter((account) =>
        account.role === "student"
          ? account.hostel === req.hostelScope
          : account.role === (req.hostelScope === "boys" ? "boys_admin" : "girls_admin")
      );
    }
    if (search) {
      accounts = accounts.filter((a) =>
        [a.full_name, a.email, a.username, a.id].some((v) => String(v || "").toLowerCase().includes(search))
      );
    }
    if (roleFilter) accounts = accounts.filter((a) => a.role === roleFilter);
    if (statusFilter) accounts = accounts.filter((a) => a.status === statusFilter);

    const total = accounts.length;
    const startIndex = (page - 1) * perPage;
    const data = accounts.slice(startIndex, startIndex + perPage);
    res.json({
      data,
      pagination: {
        page, perPage, total,
        hasMore: startIndex + perPage < total,
        totalPages: Math.max(1, Math.ceil(total / perPage)),
      },
    });
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

/**
 * DELETE /api/accounts/:id — permanently delete an account.
 * Super-admin only. For students, also removes the linked student row and
 * dependent records configured with ON DELETE CASCADE.
 */
router.delete("/:id", requireSuperAdmin, async (req, res, next) => {
  try {
    const accountId = req.params.id;

    if (accountId === req.userId) {
      return res.status(400).json({
        error: { message: "You cannot permanently delete your own account." },
      });
    }

    const admin = req.supabaseAdmin;
    const { data: targetResult, error: targetError } =
      await admin.auth.admin.getUserById(accountId);
    if (targetError) throw targetError;

    const target = targetResult.user;
    const targetRole = target.app_metadata?.role || target.user_metadata?.role;
    if (targetRole === "super_admin") {
      return res.status(400).json({
        error: { message: "A super-admin account cannot be permanently deleted from this screen." },
      });
    }

    // Remove the Auth identity first. The students.auth_id FK is ON DELETE SET NULL,
    // so student data remains intact if the following cleanup needs manual recovery.
    const { error: deleteAuthError } = await admin.auth.admin.deleteUser(accountId);
    if (deleteAuthError) throw deleteAuthError;

    if (targetRole === "student") {
      const { data: linkedStudent, error: studentLookupError } = await admin
        .from("students")
        .select("id")
        .eq("auth_id", accountId)
        .maybeSingle();
      if (studentLookupError) throw studentLookupError;

      if (linkedStudent?.id) {
        const { error: studentDeleteError } = await admin
          .from("students")
          .delete()
          .eq("id", linkedStudent.id);
        if (studentDeleteError) {
          console.error("[ACCOUNT_DELETE_PARTIAL]", {
            accountId,
            message: studentDeleteError.message,
          });
          return res.status(500).json({
            error: {
              message: "The login was deleted, but the linked student record could not be removed. Please contact the system administrator to finish cleanup.",
            },
          });
        }
      }
    }

    res.json({ success: true, deleted: true });
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

/** POST /api/accounts/:id/deactivate — super admins, or scoped admins for students in their hostel */
router.post("/:id/deactivate", async (req, res, next) => {
  try {
    // Prevent self-deactivation
    if (req.params.id === req.userId) {
      return res.status(400).json({
        error: { message: "You cannot deactivate your own account." },
      });
    }

    const { data: targetResult, error: targetError } =
      await req.supabaseAdmin.auth.admin.getUserById(req.params.id);
    if (targetError) throw targetError;

    if (req.role !== "super_admin") {
      const target = targetResult.user;
      const targetRole = target.app_metadata?.role || target.user_metadata?.role;
      const targetHostel = target.app_metadata?.hostel;
      if (
        targetRole !== "student" ||
        !req.hostelScope ||
        targetHostel !== req.hostelScope
      ) {
        return res.status(403).json({
          error: { message: "You can only deactivate student accounts belonging to your hostel." },
        });
      }
    }

    const { error } = await req.supabaseAdmin.auth.admin.updateUserById(
      req.params.id,
      { ban_duration: "876000h" } // ~100 years; reversible by removing the ban
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
