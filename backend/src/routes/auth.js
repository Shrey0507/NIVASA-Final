/**
 * Auth routes — /api/auth/*
 *
 * POST /api/auth/login     — authenticate and return session + role
 * GET  /api/auth/me        — return the current user's trusted role and profile
 * POST /api/auth/bootstrap — one-time super_admin assignment (protected)
 */
import { Router } from "express";
import { extractRole, extractHostelScope } from "../middleware/authorize.js";

const router = Router();

/**
 * The designated super admin email. Normalized to lowercase.
 * This is only used for the bootstrap endpoint to assign the initial
 * super_admin role — it does NOT grant privileges by itself.
 */
const SUPER_ADMIN_EMAIL = "shreyankvy@gmail.com";

/**
 * POST /api/auth/login
 *
 * Accepts { identifier, password } and signs in via Supabase Auth.
 * Returns the session tokens and the user's trusted role.
 *
 * The frontend calls this, then sets the session via supabase.auth.setSession().
 */
router.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({
        error: { message: "Email/username and password are required." },
      });
    }

    const admin = req.supabaseAdmin;

    // Sign in with email/password using the admin client
    const email = identifier.includes("@") ? identifier.trim().toLowerCase() : identifier.trim();
    const { data: signInData, error: signInErr } =
      await admin.auth.signInWithPassword({ email, password });
    if (signInErr) {
      return res.status(401).json({
        error: { message: "Invalid credentials. Please check your email and password." },
      });
    }

    const user = signInData.user;
    const session = signInData.session;
    const role = extractRole({
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    });

    // Look up student record if student role
    let studentRecord = null;
    if (role === "student") {
      const { data: sData } = await admin
        .from("students")
        .select("*, rooms(room_number)")
        .eq("auth_id", user.id)
        .maybeSingle();
      studentRecord = sData;
    }

    res.json({
      session: {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        token_type: session.token_type,
      },
      role: role || "unknown",
      hostel: extractHostelScope(role),
      profile: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        role,
      },
      student: studentRecord,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 *
 * Returns the trusted role and profile for the currently authenticated user.
 * This is the single source of truth the frontend uses after session restoration.
 */
router.get("/me", async (req, res, next) => {
  try {
    const admin = req.supabaseAdmin;

    // Fetch the full user object from Supabase Auth to get app_metadata
    const { data: userData, error: userErr } =
      await admin.auth.admin.getUserById(req.userId);
    if (userErr || !userData?.user) {
      return res.status(401).json({
        error: { message: "Unable to verify user identity." },
      });
    }

    const user = userData.user;
    const role = extractRole({
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    });

    // Look up student record if student role
    let studentRecord = null;
    if (role === "student") {
      const { data: sData } = await admin
        .from("students")
        .select("*, rooms(room_number)")
        .eq("auth_id", user.id)
        .maybeSingle();
      studentRecord = sData;
    }

    res.json({
      role: role || "unknown",
      hostel: extractHostelScope(role),
      profile: {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email,
        role,
      },
      student: studentRecord,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/bootstrap
 *
 * One-time bootstrap to assign the super_admin role to the designated email.
 *
 * Security:
 * - Only works for the hardcoded SUPER_ADMIN_EMAIL
 * - The caller must be authenticated as that exact user (verified via JWT sub)
 * - Uses app_metadata (only settable via service-role key)
 * - Safe to re-run (idempotent)
 * - Does NOT expose any secrets or accept arbitrary email/role inputs
 */
router.post("/bootstrap", async (req, res, next) => {
  try {
    const admin = req.supabaseAdmin;

    // Get the full auth user to verify email
    const { data: userData, error: userErr } =
      await admin.auth.admin.getUserById(req.userId);
    if (userErr || !userData?.user) {
      return res.status(401).json({
        error: { message: "Unable to verify user identity." },
      });
    }

    const user = userData.user;
    const normalizedEmail = (user.email || "").trim().toLowerCase();

    // Only the designated super admin email can use this endpoint
    if (normalizedEmail !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        error: { message: "This account is not authorized for bootstrap." },
      });
    }

    // Check if already bootstrapped
    if (user.app_metadata?.role === "super_admin") {
      return res.json({
        message: "Already bootstrapped as super_admin.",
        role: "super_admin",
      });
    }

    // Set app_metadata.role = super_admin (only service-role can do this)
    const { error: updateErr } = await admin.auth.admin.updateUserById(
      user.id,
      {
        app_metadata: { ...user.app_metadata, role: "super_admin" },
      }
    );
    if (updateErr) throw updateErr;

    res.json({
      message: "Successfully bootstrapped as super_admin.",
      role: "super_admin",
    });
  } catch (err) {
    next(err);
  }
});

export default router;
