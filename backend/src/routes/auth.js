/**
 * Auth routes — /api/auth/*
 *
 * This module exports TWO routers:
 *
 *   publicRouter    → POST /login  (no JWT required — this IS the login)
 *   protectedRouter → GET /me, POST /bootstrap  (JWT required)
 *
 * index.js mounts publicRouter BEFORE authMiddleware and protectedRouter AFTER.
 */
import { Router } from "express";
import { getAdminClient } from "../lib/supabase.js";
import { extractRole, extractHostelScope } from "../middleware/authorize.js";

const SUPER_ADMIN_EMAIL = "shreyankvy@gmail.com";

// ── Public router (no auth required) ────────────────────────

export const publicRouter = Router();

/**
 * POST /api/auth/login
 *
 * Genuinely public endpoint. Accepts { identifier, password }, authenticates
 * via Supabase Auth using the admin client (service-role key), and returns
 * the session tokens plus the user's trusted role.
 *
 * The admin client is created directly here — req.supabaseAdmin is NOT
 * available because this route runs before authMiddleware.
 */
publicRouter.post("/login", async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({
        error: { message: "Email/username and password are required." },
      });
    }

    // Create admin client directly — NOT from req (we're pre-auth)
    const admin = getAdminClient();

    const email = identifier.includes("@")
      ? identifier.trim().toLowerCase()
      : identifier.trim();

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

// ── Protected router (JWT required — mounted after authMiddleware) ───

export const protectedRouter = Router();

/**
 * GET /api/auth/me
 *
 * Returns the trusted role and profile for the currently authenticated user.
 * Requires a valid Bearer token (runs after authMiddleware).
 */
protectedRouter.get("/me", async (req, res, next) => {
  try {
    const admin = req.supabaseAdmin;

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
 * One-time super_admin assignment for the designated email.
 * Requires a valid Bearer token (runs after authMiddleware).
 */
protectedRouter.post("/bootstrap", async (req, res, next) => {
  try {
    const admin = req.supabaseAdmin;

    const { data: userData, error: userErr } =
      await admin.auth.admin.getUserById(req.userId);
    if (userErr || !userData?.user) {
      return res.status(401).json({
        error: { message: "Unable to verify user identity." },
      });
    }

    const user = userData.user;
    const normalizedEmail = (user.email || "").trim().toLowerCase();

    if (normalizedEmail !== SUPER_ADMIN_EMAIL) {
      return res.status(403).json({
        error: { message: "This account is not authorized for bootstrap." },
      });
    }

    if (user.app_metadata?.role === "super_admin") {
      return res.json({
        message: "Already bootstrapped as super_admin.",
        role: "super_admin",
      });
    }

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

// Default export kept for backward-compat (not used by new index.js)
export default protectedRouter;
