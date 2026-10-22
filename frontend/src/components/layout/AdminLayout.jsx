import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "./AppShell";
import { adminNav } from "@/config/navigation";
import { useAuth, ADMIN_ROLES } from "@/hooks/useAuth";

export default function AdminLayout() {
  const navigate = useNavigate();
  const { user, role, logout, loading, isAuthenticated, isAdmin } = useAuth();

  useEffect(() => {
    if (!loading && (!isAuthenticated || !isAdmin)) {
      navigate("/login", { replace: true });
    }
  }, [loading, isAuthenticated, isAdmin, navigate]);

  // Show nothing while loading or redirecting to prevent flash of unauthorized content
  if (loading || !isAuthenticated || !isAdmin) return null;

  return (
    <AppShell
      nav={adminNav}
      subtitle="Admin Console"
      user={user || "Administrator"}
      role={ADMIN_ROLES[role]?.label ?? "Administrator"}
      onLogout={async () => {
        await logout();
        navigate("/login");
      }}
    />
  );
}
