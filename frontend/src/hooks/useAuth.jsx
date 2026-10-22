import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import supabase from "@/lib/supabase";
import { apiRequest } from "@/lib/apiClient";

export const ADMIN_ROLES = {
  super: { label: "Super Administrator", hostel: null },
  boys: { label: "Boys' Hostel Administrator", hostel: "boys" },
  girls: { label: "Girls' Hostel Administrator", hostel: "girls" },
};

const INITIAL = {
  isAuthenticated: false,
  loading: true,
  role: null,
  hostel: null,
  user: null,
  profile: null,
  student: null,
  serverRole: null, // raw role from server
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(INITIAL);

  const loadSession = useCallback(async (session) => {
    if (!session) return setAuth({ ...INITIAL, loading: false });
    try {
      const me = await apiRequest("/auth/me");
      const profile = me.profile || {};
      const serverRole = me.role; // authoritative: student | super_admin | hostel_admin | warden | admin
      const isStudent = serverRole === "student";
      const profileHostel = profile.hostel || profile.hostel_type || profile.hostel_category;

      // Map server role to frontend display role
      let accessRole;
      if (isStudent) {
        accessRole = "student";
      } else if (serverRole === "super_admin") {
        accessRole = "super";
      } else if (["hostel_admin", "warden"].includes(serverRole)) {
        accessRole = profileHostel === "girls" ? "girls" : "boys";
      } else {
        // fallback for "admin" role — treat as super
        accessRole = "super";
      }

      const student = isStudent
        ? (me.student || profile.student || profile.student_record || profile)
        : null;

      setAuth({
        isAuthenticated: true,
        loading: false,
        role: accessRole,
        hostel: profileHostel || null,
        user: profile.full_name || session.user.email,
        profile,
        student,
        serverRole,
      });
    } catch {
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

  const login = useCallback(async (identifier, password) => {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    // setSession triggers onAuthStateChange which calls loadSession
    await supabase.auth.setSession(result.session);
    return result;
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
      getHostelFilter: () => auth.hostel,
      canAccessHostel: (hostel) => auth.role === "super" || auth.hostel === hostel,
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
