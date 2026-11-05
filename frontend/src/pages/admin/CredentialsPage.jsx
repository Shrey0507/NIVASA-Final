import { useEffect, useState } from "react";
import { RefreshCw, Eye, EyeOff, Key, Trash2 } from "lucide-react";
import { listAccounts, createAccount, resetPassword, deleteAccount } from "@/services/accounts";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// Generate a random 12-character password
function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

const EMPTY = {
  full_name: "",
  email: "",
  username: "",
  password: "",
  usn: "",
  hostel: "boys",
  phone: "",
  department: "",
  year: 1,
};

export default function CredentialsPage() {
  const { serverRole, hostel: userHostel } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [mode, setMode] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Reset password dialog state
  const [resetDialog, setResetDialog] = useState({ open: false, userId: null, password: "", loading: false, error: "" });
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, userId: null, loading: false, error: "" });

  const isSuperAdmin = serverRole === "super_admin";
  const isHostelAdmin = serverRole === "boys_admin" || serverRole === "girls_admin";

  // Determine initial mode and hostel based on logged-in user
  useEffect(() => {
    if (isHostelAdmin && !isSuperAdmin) {
      setMode("student");
      setForm((prev) => ({ ...prev, hostel: userHostel || "boys" }));
    }
  }, [isSuperAdmin, isHostelAdmin, userHostel]);

  const load = () => {
    listAccounts()
      .then(setAccounts)
      .catch((e) => setError(e.message));
  };

  useEffect(() => {
    load();
  }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleGeneratePassword = () => {
    update("password", generatePassword());
    setShowPassword(true);
  };

  const validateForm = () => {
    if (!form.full_name.trim()) return "Full name is required";
    if (!form.email.trim()) return "Official email is required";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email format";
    if (!form.password || form.password.length < 8) return "Password must be at least 8 characters";
    if (mode === "student" && !form.usn.trim()) return "USN is required for students";
    if (form.username && /\s/.test(form.username)) return "Username cannot contain spaces";
    return null;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      let roleValue;
      if (mode === "student") {
        roleValue = "student";
      } else {
        // Admin roles
        if (form.hostel === "all") roleValue = "super_admin";
        else if (form.hostel === "girls") roleValue = "girls_admin";
        else roleValue = "boys_admin";
      }

      await createAccount({
        email: form.email.toLowerCase().trim(),
        password: form.password,
        role: roleValue,
        fullName: form.full_name.trim(),
        username: form.username.trim() || undefined,
        usn: mode === "student" ? form.usn.toUpperCase() : undefined,
        hostel: form.hostel,
      });

      setMessage("Account created. Share these credentials securely.");
      setForm(EMPTY);
      // Reset hostel to user's own if hostel admin
      if (isHostelAdmin) {
        setForm((prev) => ({ ...prev, hostel: userHostel || "boys" }));
      }
      load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Reset password handler
  const handleResetPassword = async () => {
    if (!resetDialog.password || resetDialog.password.length < 8) {
      setResetDialog((prev) => ({ ...prev, error: "Password must be at least 8 characters" }));
      return;
    }
    setResetDialog((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      await resetPassword(resetDialog.userId, resetDialog.password);
      setResetDialog({ open: false, userId: null, password: "", loading: false, error: "" });
      setMessage("Password reset successfully.");
    } catch (e) {
      setResetDialog((prev) => ({ ...prev, loading: false, error: e.message }));
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    setDeleteDialog((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      await deleteAccount(deleteDialog.userId);
      setDeleteDialog({ open: false, userId: null, loading: false, error: "" });
      setMessage("Account deleted successfully.");
      load();
    } catch (e) {
      setDeleteDialog((prev) => ({ ...prev, loading: false, error: e.message }));
    }
  };

  // Get hostel options based on role
  const getHostelOptions = () => {
    const options = [];
    if (mode === "student" || (mode === "admin" && !isSuperAdmin)) {
      // Students and non-super admins can only see their own hostel
      const hostelValue = isHostelAdmin ? userHostel : form.hostel;
      if (hostelValue === "boys") {
        options.push({ value: "boys", label: "Boys' Hostel" });
      } else if (hostelValue === "girls") {
        options.push({ value: "girls", label: "Girls' Hostel" });
      } else {
        options.push({ value: "boys", label: "Boys' Hostel" });
        options.push({ value: "girls", label: "Girls' Hostel" });
      }
    } else {
      // Super admin creating admin
      options.push({ value: "boys", label: "Boys' Hostel" });
      options.push({ value: "girls", label: "Girls' Hostel" });
      options.push({ value: "all", label: "Super Admin (all hostels)" });
    }
    return options;
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case "super_admin":
        return "default";
      case "boys_admin":
        return "secondary";
      case "girls_admin":
        return "outline";
      case "student":
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "super_admin":
        return "Super Admin";
      case "boys_admin":
        return "Boys Admin";
      case "girls_admin":
        return "Girls Admin";
      case "student":
        return "Student";
      default:
        return role;
    }
  };

  return (
    <>
      <PageHeader title="Accounts" description="Create and manage user accounts." />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Create Account Form */}
        <SectionCard title="Create account" description="Add a new user account with direct password setup.">
          <form id="account-form" onSubmit={submit} className="space-y-3">
            {/* Mode Toggle - Only show for Super Admin */}
            {isSuperAdmin && (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={mode === "student" ? "default" : "outline"}
                  onClick={() => setMode("student")}
                >
                  Student
                </Button>
                <Button
                  type="button"
                  variant={mode === "admin" ? "default" : "outline"}
                  onClick={() => setMode("admin")}
                >
                  Hostel admin
                </Button>
              </div>
            )}

            {/* Full Name */}
            <div>
              <Label>Full name *</Label>
              <Input
                required
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                placeholder="John Doe"
              />
            </div>

            {/* Official Email */}
            <div>
              <Label>Official email *</Label>
              <Input
                required
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="john.doe@institution.edu"
              />
            </div>

            {/* Username */}
            <div>
              <Label>Username</Label>
              <Input
                pattern="[a-z0-9._-]{4,30}"
                value={form.username}
                onChange={(e) => update("username", e.target.value.toLowerCase())}
                placeholder="johndoe (optional)"
              />
            </div>

            {/* Password */}
            <div>
              <Label>Password *</Label>
              <div className="relative">
                <Input
                  required
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  placeholder="Min 8 characters"
                  minLength={8}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={handleGeneratePassword}
              >
                <Key className="size-4 mr-1" />
                Generate
              </Button>
            </div>

            {/* Hostel Scope */}
            <div>
              <Label>Hostel scope</Label>
              <select
                className="mt-1 w-full rounded-md border bg-background p-2"
                value={form.hostel}
                onChange={(e) => update("hostel", e.target.value)}
                disabled={isHostelAdmin && !isSuperAdmin}
              >
                {getHostelOptions().map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Student-specific fields */}
            {mode === "student" && (
              <>
                {/* USN */}
                <div>
                  <Label>Student ID / USN *</Label>
                  <Input
                    required
                    value={form.usn}
                    onChange={(e) => update("usn", e.target.value.toUpperCase())}
                    placeholder="1RV23CS001"
                  />
                </div>

                {/* Phone and Year */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={form.phone}
                      onChange={(e) => update("phone", e.target.value)}
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div>
                    <Label>Year</Label>
                    <Input
                      type="number"
                      min="1"
                      max="6"
                      value={form.year}
                      onChange={(e) => update("year", Number(e.target.value))}
                    />
                  </div>
                </div>

                {/* Department */}
                <div>
                  <Label>Department</Label>
                  <Input
                    value={form.department}
                    onChange={(e) => update("department", e.target.value)}
                    placeholder="Computer Science"
                  />
                </div>
              </>
            )}

            {/* Error Message */}
            {error && <p className="text-sm text-destructive">{error}</p>}

            {/* Success Message */}
            {message && <p className="text-sm text-green-600">{message}</p>}

            {/* Submit Button */}
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create account"}
            </Button>
          </form>
        </SectionCard>

        {/* Managed Accounts List */}
        <SectionCard
          title="Managed accounts"
          description={
            <div className="flex items-center gap-2">
              <span>View and manage existing accounts.</span>
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={load}
                title="Refresh list"
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          }
        >
          {accounts.length === 0 ? (
            <EmptyState
              title="No accounts found"
              description="Create a student or hostel administrator to begin."
            />
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{account.full_name || account.email}</p>
                    <p className="text-sm text-muted-foreground">
                      {account.email}
                      {account.username && (
                        <span> @{account.username}</span>
                      )}
                      {account.usn && (
                        <span> ({account.usn})</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getRoleBadgeVariant(account.role)}>
                      {getRoleLabel(account.role)}
                    </Badge>
                    <Badge variant={account.is_active ? "default" : "secondary"}>
                      {account.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {isSuperAdmin && (
                      <>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Reset password"
                          onClick={() =>
                            setResetDialog({
                              open: true,
                              userId: account.id,
                              password: "",
                              loading: false,
                              error: "",
                            })
                          }
                        >
                          <Key className="size-4" />
                        </Button>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          title="Delete account"
                          onClick={() =>
                            setDeleteDialog({
                              open: true,
                              userId: account.id,
                              loading: false,
                              error: "",
                            })
                          }
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Reset Password Dialog */}
      <ConfirmDialog
        open={resetDialog.open}
        title="Reset Password"
        description="Enter a new password for this user (min 8 characters)."
        confirmLabel="Reset Password"
        onConfirm={handleResetPassword}
        onCancel={() =>
          setResetDialog({ open: false, userId: null, password: "", loading: false, error: "" })
        }
        loading={resetDialog.loading}
        error={resetDialog.error}
      >
        <div className="py-3">
          <Input
            type="password"
            placeholder="New password (min 8 characters)"
            value={resetDialog.password}
            onChange={(e) =>
              setResetDialog((prev) => ({ ...prev, password: e.target.value }))
            }
            minLength={8}
          />
        </div>
      </ConfirmDialog>

      {/* Delete Account Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        title="Delete Account"
        description="Are you sure you want to delete this account? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteAccount}
        onCancel={() =>
          setDeleteDialog({ open: false, userId: null, loading: false, error: "" })
        }
        loading={deleteDialog.loading}
        error={deleteDialog.error}
      />
    </>
  );
}