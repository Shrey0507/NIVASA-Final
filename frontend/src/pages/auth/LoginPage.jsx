import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Lock, Mail, Shield, GraduationCap } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { useAuth } from "@/hooks/useAuth";
import supabase from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * LoginPage — Two primary login options: Admin Login and Student Login.
 *
 * Accepts an optional initialMode prop ("admin" | "student") so that
 * /admin/login and /student/login open the correct form directly.
 *
 * Authorization is ALWAYS determined server-side via app_metadata.role.
 * The mode selector only controls the login experience — it never grants
 * privileges.
 */
export default function LoginPage({ initialMode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, role, loading: authLoading } = useAuth();
  const [mode, setMode] = useState(initialMode || "student"); // "admin" | "student"
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Sync mode whenever URL or initialMode changes
  useEffect(() => {
    if (initialMode) {
      setMode(initialMode);
    } else if (location.pathname === "/admin/login") {
      setMode("admin");
    } else {
      setMode("student");
    }
  }, [initialMode, location.pathname]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated && role) {
      if (role === "student") {
        navigate("/student", { replace: true });
      } else {
        navigate("/admin", { replace: true });
      }
    }
  }, [authLoading, isAuthenticated, role, navigate]);

  const switchMode = (newMode) => {
    setError("");
    setMessage("");
    setForm({ identifier: "", password: "" });
    navigate(`/${newMode}/login`);
    setMode(newMode);
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!form.identifier.trim() || !form.password)
      return setError("Email/username and password are required.");
    setLoading(true);
    try {
      await login(form.identifier, form.password);
      // After login, onAuthStateChange fires → loadSession → role is set
      // The useEffect above handles redirect based on role
    } catch (err) {
      setError(
        err?.message || "Unable to sign in. Check your credentials or contact the hostel office."
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setError("");
    setMessage("");
    if (!form.identifier.includes("@"))
      return setError("Enter your registered email to request a reset link.");
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      form.identifier,
      { redirectTo: `${window.location.origin}/login` }
    );
    if (resetError) setError("Unable to send a reset email.");
    else setMessage("If the account exists, a password reset email has been sent.");
  };

  // Don't render login form while checking existing session
  if (authLoading) return null;

  // ── Login Form (shared by both admin and student modes) ───────────────
  const isAdmin = mode === "admin";

  return (
    <AuthLayout
      footer={
        <p className="mt-6 text-center text-sm text-white/60">
          NIVASA accounts are provisioned by authorized hostel administrators.
        </p>
      }
    >

      {/* Switcher Tabs */}
      <div className="grid grid-cols-2 gap-1 p-1 mb-6 rounded-xl bg-white/5 border border-white/10">
        <button
          type="button"
          onClick={() => switchMode("admin")}
          className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-all ${isAdmin
              ? "bg-violet-600/80 text-white shadow-sm shadow-violet-500/20"
              : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
        >
          <Shield className="size-3.5" />
          Admin
        </button>
        <button
          type="button"
          onClick={() => switchMode("student")}
          className={`flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg transition-all ${!isAdmin
              ? "bg-emerald-600/80 text-white shadow-sm shadow-emerald-500/20"
              : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
        >
          <GraduationCap className="size-3.5" />
          Student
        </button>
      </div>

      <div className="flex items-center gap-3 mb-1">
        <div
          className={`flex size-9 items-center justify-center rounded-lg ${isAdmin ? "bg-violet-500/20 text-violet-300" : "bg-emerald-500/20 text-emerald-300"}`}
        >
          {isAdmin ? <Shield className="size-4" /> : <GraduationCap className="size-4" />}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          {isAdmin ? "Admin Login" : "Student Login"}
        </h1>
      </div>
      <p className="mt-2 text-sm text-white/70">
        {isAdmin
          ? "Sign in with your administrator credentials."
          : "Sign in with your student email or username."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="identifier" className="text-white/85">
            Email or username
          </Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="identifier"
              required
              className="border-white/15 bg-white/10 pl-9 text-white"
              value={form.identifier}
              onChange={(e) => setForm({ ...form, identifier: e.target.value })}
              autoComplete="username"
              placeholder={isAdmin ? "admin@institution.edu" : "student@institution.edu"}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-white/85">
            Password
          </Label>
          <div className="relative">
            <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40" />
            <Input
              id="password"
              required
              type={showPassword ? "text" : "password"}
              className="border-white/15 bg-white/10 pl-9 pr-10 text-white"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-rose-300">{error}</p>}
        {message && <p className="text-sm text-emerald-300">{message}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in\u2026" : "Sign in"}
          {!loading && <ArrowRight className="ml-1 size-4" />}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-violet-300 hover:underline"
          onClick={reset}
        >
          Forgot password?
        </button>
      </form>

      <p className="mt-5 text-center text-xs text-white/50">
        {isAdmin ? (
          <button
            type="button"
            onClick={() => switchMode("student")}
            className="hover:underline text-white/70 hover:text-white"
          >
            Sign in as Student instead &rarr;
          </button>
        ) : (
          <button
            type="button"
            onClick={() => switchMode("admin")}
            className="hover:underline text-white/70 hover:text-white"
          >
            Sign in as Admin instead &rarr;
          </button>
        )}
      </p>
    </AuthLayout>
  );
}
