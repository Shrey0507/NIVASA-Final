/**
 * Auth middleware — verifies the caller's JWT using @supabase/server core.
 *
 * On success it attaches:
 *   req.auth       — the full AuthResult (authMode, token, userClaims, jwtClaims, keyName)
 *   req.userId     — shortcut to the user's UUID (jwtClaims.sub)
 *   req.supabase   — RLS-scoped Supabase client for the caller
 *   req.supabaseAdmin — admin client (bypasses RLS)
 */
import { verifyAuth } from "@supabase/server/core";
import { getUserClient, getAdminClient } from "../lib/supabase.js";

export async function authMiddleware(req, res, next) {
  try {
    // Build a minimal Web Request from the Express req so verifyAuth can read headers
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (value) headers.set(key, Array.isArray(value) ? value[0] : value);
    }

    const webRequest = new Request(
      `${req.protocol}://${req.get("host")}${req.originalUrl}`,
      { method: req.method, headers }
    );

    const { data: auth, error } = await verifyAuth(webRequest, {
      auth: "user",
    });

    if (error) {
      return res.status(error.status || 401).json({
        error: { message: error.message, code: error.code },
      });
    }

    req.auth = auth;
    req.userId = auth.jwtClaims?.sub;
    req.supabase = getUserClient(auth);
    req.supabaseAdmin = getAdminClient();
    next();
  } catch (err) {
    console.error("[AUTH]", err);
    return res.status(401).json({
      error: { message: "Authentication failed" },
    });
  }
}
