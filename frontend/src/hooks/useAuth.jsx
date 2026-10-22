import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import supabase from "@/lib/supabase";
import { apiRequest } from "@/lib/apiClient";

/**
 * Role definitions for the admin side.
 * Maps the server role → display label and hostel scope.
 */
export const ADMIN_ROLES = {
  super_admin: { label: "Super Administrator", hostel: null },
  boys_admin:  { label: "Boys' Hostel Administrator", hostel: "boys" },
  girls_admin: { label: "Girls' Hostel Administrator", hostel: "girls" },
  // Legacy mappings kept for backward compat in AdminLayout display
  super: { label: "Super Administrator", hostel: null },
  boys:  { label: "Boys' Hostel Administrator", hostel: "boys" },
  girls: { label: "Girls' Hostel Administrator", hostel: "girls" },
};

const ADMIN_ROLE_SET = new Set(["super_admin", "boys_admin", "girls_admin"]);

const INITIAL = {
  isAuthenticated: false,
  loading: true,
  role: null,        // "super_admin" | "boys_admin" | "girls_admin" | "student" | null
  displayRole: null, // "super" | "boys" | "girls" | "student" — for UI routing
  hostel: null,
  user: null,
  profile: null,
  student: null,
};

const AuthContext = createContext(null);

/**
 * Map the server's canonical role to the frontend's shorter display role
 * used in routing and AdminLayout.
 */
function toDisplayRole(serverRole) {
  if (serverRole === "super_admin") return "super";
  if (serverRole === "boys_admin") return "boys";
  if (serverRole === "girls_admin") return "girls";
  if (serverRole === "student") return "student";
  return null;
}

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(INITIAL);

  /**
   * Fetch the authenticated user's trusted role and profile from the backend.
   * This is the single source of truth — never trust client-side data.
   */
  const loadSession = useCallback(async (session) => {
    if (!session) return setAuth({ ...INITIAL, loading: false });
    try {
      const me = await apiRequest("/auth/me");
      const serverRole = me.role; // super_admin | boys_admin | girls_admin | student | unknown
      const profile = me.profile || {};
      const displayRole = toDisplayRole(serverRole);

      if (!displayRole || serverRole === "unknown") {
        // No valid role assigned — sign out and show message
        await supabase.auth.signOut();
        return setAuth({ ...INITIAL, loading: false });
      }

      const student = serverRole === "student" ? (me.student || null) : null;

      setAuth({
        isAuthenticated: true,
        loading: false,
        role: displayRole,
        serverRole,
        hostel: me.hostel || null,
        user: profile.full_name || session.user?.email || "User",
        profile,
        student,
        displayRole,
      });
    } catch {
      // Auth verification failed — clear session
      await supabase.auth.signOut();
      setAuth({ ...INITIAL, loading: false });
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => loadSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSession(session);
    });
    return () => subscription.unsubscribe();
  }, [loadSession]);

  /**
   * Login: authenticate via Supabase directly, then loadSession handles
   * fetching the trusted role from the backend.
   */
  const login = useCallback(async (identifier, password) => {
    const email = identifier.includes("@")
      ? identifier.trim().toLowerCase()
      : identifier.trim();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw new Error(error.message || "Invalid credentials.");
    }
    // onAuthStateChange will fire and call loadSession automatically
    return data;
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setAuth({ ...INITIAL, loading: false });
  }, []);

  const value = useMemo(
    () => ({
      ...auth,
      login,
      logout,
      loginAdmin: login,
      loginStudent: login,
      isAdmin: ADMIN_ROLE_SET.has(auth.serverRole),
      isSuperAdmin: auth.serverRole === "super_admin",
      getHostelFilter: () => auth.hostel,
      canAccessHostel: (hostel) =>
        auth.role === "super" || auth.hostel === hostel,
    }),
    [auth, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value)
    throw new Error("useAuth must be used within AuthProvider");
  return value;
}
