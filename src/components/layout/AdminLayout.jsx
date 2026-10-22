import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "./AppShell";
import { adminNav } from "@/config/navigation";
import { useAuth, ADMIN_ROLES } from "@/hooks/useAuth";
export default function AdminLayout() { const navigate = useNavigate(); const { user, role, logout, loading, isAuthenticated } = useAuth(); useEffect(() => { if (!loading && (!isAuthenticated || role === "student")) navigate("/login", { replace: true }); }, [loading, isAuthenticated, role, navigate]); if (loading || !isAuthenticated || role === "student") return null; return <AppShell nav={adminNav} subtitle="Admin Console" user={user || "Administrator"} role={ADMIN_ROLES[role]?.label ?? "Administrator"} onLogout={async () => { await logout(); navigate("/login"); }} />; }
