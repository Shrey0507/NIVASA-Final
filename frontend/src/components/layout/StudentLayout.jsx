import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "./AppShell";
import { studentNav } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
export default function StudentLayout() { const navigate = useNavigate(); const { user, profile, student, logout, loading, isAuthenticated, role } = useAuth(); useEffect(() => { if (!loading && (!isAuthenticated || role !== "student")) navigate("/login", { replace: true }); }, [loading, isAuthenticated, role, navigate]); if (loading || !isAuthenticated || role !== "student") return null; const record = student || profile || {}; return <AppShell nav={studentNav} subtitle="Student Portal" user={user || record.full_name || "Student"} role={`${record.department || "Student"} · ${record.year || ""}`} onLogout={async () => { await logout(); navigate("/login"); }} />; }
