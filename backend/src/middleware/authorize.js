/**
 * Authorization middleware for NIVASA.
 *
 * Role truth comes from `app_metadata.role` in the Supabase JWT claims,
 * which only the service-role key (admin API) can set. Users cannot modify
 * their own app_metadata.
 *
 * Supported roles: super_admin | boys_admin | girls_admin | student
 */

const ADMIN_ROLES = new Set(["super_admin", "boys_admin", "girls_admin"]);
const ALL_ROLES = new Set(["super_admin", "boys_admin", "girls_admin", "student"]);

/**
 * Extract the trusted role from JWT claims.
 * Checks app_metadata first (authoritative), then falls back to user_metadata
 * for backward compatibility with accounts created before migration.
 */
export function extractRole(jwtClaims) {
  const appMeta = jwtClaims?.app_metadata || {};
  const userMeta = jwtClaims?.user_metadata || {};
  // app_metadata.role is authoritative
  if (appMeta.role && ALL_ROLES.has(appMeta.role)) return appMeta.role;
  // fallback: if user_metadata.role is "student" we trust it (users can set
  // their own user_metadata, but "student" is the least-privileged role)
  if (userMeta.role === "student") return "student";
  // No trusted role found
  return null;
}

/**
 * Extract the hostel scope for the user.
 * super_admin has access to all hostels (returns null = no restriction).
 * boys_admin → "boys", girls_admin → "girls"
 * students → their own hostel from the student record (resolved per-request)
 */
export function extractHostelScope(role) {
  if (role === "super_admin") return null; // unrestricted
  if (role === "boys_admin") return "boys";
  if (role === "girls_admin") return "girls";
  return null; // students are scoped differently (by their own record)
}

/**
 * Middleware: attach role and hostelScope to req after auth middleware has run.
 * Must be used AFTER authMiddleware.
 */
export function attachRole(req, _res, next) {
  const role = extractRole(req.auth?.jwtClaims);
  req.role = role;
  req.hostelScope = extractHostelScope(role);
  next();
}

/**
 * Middleware factory: require that the user has one of the specified roles.
 * @param  {...string} roles — allowed roles
 */
export function requireRole(...roles) {
  const allowed = new Set(roles);
  return (req, res, next) => {
    if (!req.role) {
      return res.status(403).json({
        error: { message: "No role assigned to this account. Contact the hostel administrator." },
      });
    }
    if (!allowed.has(req.role)) {
      return res.status(403).json({
        error: { message: "You do not have permission to access this resource." },
      });
    }
    next();
  };
}

/**
 * Middleware: require any admin role (super_admin, boys_admin, girls_admin).
 */
export function requireAdmin(req, res, next) {
  if (!req.role || !ADMIN_ROLES.has(req.role)) {
    return res.status(403).json({
      error: { message: "Administrator access required." },
    });
  }
  next();
}

/**
 * Middleware: require super_admin role.
 */
export function requireSuperAdmin(req, res, next) {
  if (req.role !== "super_admin") {
    return res.status(403).json({
      error: { message: "Super administrator access required." },
    });
  }
  next();
}

/**
 * Middleware factory: enforce hostel-scope on queries.
 *
 * If the admin has a hostel restriction (boys_admin/girls_admin), this
 * middleware overrides the `hostel` query parameter so they can ONLY
 * access their own hostel's data — regardless of what they send.
 *
 * super_admin passes through with the original query intact.
 */
export function enforceHostelScope(req, _res, next) {
  if (req.hostelScope) {
    // Override any client-supplied hostel filter
    req.query.hostel = req.hostelScope;
  }
  next();
}

export { ADMIN_ROLES, ALL_ROLES };
