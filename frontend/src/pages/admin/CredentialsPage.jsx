import { useEffect, useState } from "react";
import { Search, RefreshCw, Trash2, ChevronLeft, ChevronRight, UserPlus, Pencil, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { getAccounts, createStudentAccount, createAdminAccount, permanentlyDeleteAccount, setAdminPassword } from "@/services/accountService";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const PAGE_SIZE = 25;
const EMPTY_FORM = { full_name: "", email: "", username: "", usn: "", password: "", hostel: "boys", phone: "", department: "", year: 1, semester: "", guardian_name: "", guardian_phone: "", address: "" };

export default function CredentialsPage() {
  const { role, userId } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [mode, setMode] = useState("student");
  const [creating, setCreating] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, hasMore: false });
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editTarget, setEditTarget] = useState(null);
  const [editPassword, setEditPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getAccounts({ page, perPage: PAGE_SIZE, search, role: roleFilter, status: statusFilter });
      setAccounts(result.data || []);
      setPagination(result.pagination || { total: 0, totalPages: 1, hasMore: false });
    } catch (e) {
      setError(e.message || "Could not load accounts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, search, roleFilter, statusFilter]);

  const updateForm = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const createAccount = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    setMessage("");
    try {
      if (mode === "student") {
        await createStudentAccount(form);
        setMessage("Student account created. They can sign in using their USN and password. No invitation email was sent.");
      } else {
        await createAdminAccount(form);
        setMessage("Hostel administrator account created with the configured password.");
      }
      setForm(EMPTY_FORM);
      setPage(1);
      setSearch("");
      setSearchInput("");
      setRoleFilter("");
      setStatusFilter("");
      await load();
    } catch (e) {
      setError(e.message || "Could not create account.");
    } finally {
      setCreating(false);
    }
  };

  const openAccountEditor = (account) => {
    setEditTarget(account);
    setEditPassword("");
    setConfirmPassword("");
    setEditError("");
    setShowEditPassword(false);
  };

  const saveAccountPassword = async (event) => {
    event.preventDefault();
    if (editPassword.length < 8) return setEditError("Password must be at least 8 characters.");
    if (editPassword !== confirmPassword) return setEditError("Passwords do not match.");
    setEditSaving(true);
    setEditError("");
    try {
      await setAdminPassword(editTarget.id, editPassword);
      setMessage(`Password updated for ${editTarget.full_name || editTarget.email}.`);
      setEditTarget(null);
    } catch (e) {
      setEditError(e.message || "Could not update password.");
    } finally {
      setEditSaving(false);
    }
  };

  const deleteFromEditor = async () => {
    if (!editTarget) return;
    const account = editTarget;
    const confirmation = window.prompt(`Permanently delete ${account.full_name || account.email}? Type DELETE to confirm.`);
    if (confirmation !== "DELETE") return;
    setBusyId(account.id);
    setEditError("");
    try {
      await permanentlyDeleteAccount(account.id);
      setMessage(`${account.full_name || account.email} was permanently deleted.`);
      setEditTarget(null);
      if (accounts.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (e) {
      setEditError(e.message || "Could not delete account.");
    } finally {
      setBusyId("");
    }
  };

  const permanentlyRemoveAccount = async (account) => {
    const confirmation = window.prompt(
      `Delete ${account.full_name || account.email} permanently? This cannot be undone. Type DELETE to confirm.`
    );
    if (confirmation !== "DELETE") return;

    setBusyId(account.id);
    setError("");
    setMessage("");
    try {
      await permanentlyDeleteAccount(account.id);
      setMessage(`${account.full_name || account.email} was permanently deleted.`);
      // Move back if deleting the only row on this page.
      if (accounts.length === 1 && page > 1) setPage((current) => current - 1);
      else await load();
    } catch (e) {
      setError(e.message || "Could not permanently delete account.");
    } finally {
      setBusyId("");
    }
  };

  const applySearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const changeFilter = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };



  return <>
    <PageHeader title="Credentials" description="Create accounts and manage access for students and hostel administrators." />
    <div className="grid items-start gap-4 2xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,2fr)]">
      <SectionCard title="Add account" description="Create a login directly. Student passwords are set by the administrator; no invitation email is sent.">
        <form onSubmit={createAccount} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" size="sm" variant={mode === "student" ? "default" : "outline"} onClick={() => setMode("student")}>Student</Button>
            {role === "super" && <Button type="button" size="sm" variant={mode === "admin" ? "default" : "outline"} onClick={() => setMode("admin")}>Hostel admin</Button>}
          </div>
          <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => updateForm("full_name", e.target.value)} /></div>
          <div><Label>Official email</Label><Input required type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} /></div>
          {mode === "admin" && <div><Label>Username</Label><Input required value={form.username} onChange={(e) => updateForm("username", e.target.value.toLowerCase())} /></div>}
          <div>
            <Label>Hostel scope</Label>
            <select className="mt-1 w-full rounded-md border bg-background p-2 text-sm" value={form.hostel} onChange={(e) => updateForm("hostel", e.target.value)}>
              <option value="boys">Boys' Hostel</option>
              <option value="girls">Girls' Hostel</option>
              {mode === "admin" && role === "super" && <option value="all">All hostels</option>}
            </select>
          </div>
          {mode === "admin" && <div><Label>Initial password</Label><Input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="At least 8 characters" /></div>}
          {mode === "student" && <>
            <div><Label>Student ID / USN</Label><Input required value={form.usn} onChange={(e) => updateForm("usn", e.target.value.toUpperCase())} /></div>
            <div><Label>Initial password</Label><Input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="At least 8 characters" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} /></div>
              <div><Label>Year</Label><Input type="number" min="1" max="6" value={form.year} onChange={(e) => updateForm("year", Number(e.target.value))} /></div>
            </div>
            <div><Label>Department</Label><Input value={form.department} onChange={(e) => updateForm("department", e.target.value)} placeholder="e.g. Computer Science" /></div>
            <div><Label>Semester</Label><Input value={form.semester} onChange={(e) => updateForm("semester", e.target.value)} placeholder="e.g. 3" /></div>
            <div><Label>Guardian name</Label><Input value={form.guardian_name} onChange={(e) => updateForm("guardian_name", e.target.value)} /></div>
            <div><Label>Guardian phone</Label><Input value={form.guardian_phone} onChange={(e) => updateForm("guardian_phone", e.target.value)} /></div>
            <div><Label>Address</Label><Input value={form.address} onChange={(e) => updateForm("address", e.target.value)} /></div>
          </>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}
          <Button type="submit" className="w-full" disabled={creating}>
            <UserPlus />{creating ? "Creating…" : mode === "student" ? "Add student account" : "Add hostel admin"}
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Managed accounts" description={`${pagination.total || 0} account(s) · ${PAGE_SIZE} per page`}>
        <div className="mb-4 flex flex-col gap-3">
          <form onSubmit={applySearch} className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search name, email, USN or account ID" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
            </div>
            <Button type="submit">Search</Button>
            {(search || searchInput) && <Button type="button" variant="outline" onClick={() => { setSearchInput(""); setSearch(""); setPage(1); }}>Clear</Button>}
          </form>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <select aria-label="Filter by role" className="w-full rounded-md border bg-background p-2 text-sm" value={roleFilter} onChange={changeFilter(setRoleFilter)}>
              <option value="">All roles</option><option value="student">Students</option><option value="boys_admin">Boys' hostel admins</option><option value="girls_admin">Girls' hostel admins</option>
              {role === "super" && <option value="super_admin">Super admins</option>}
            </select>
            <select aria-label="Filter by status" className="w-full rounded-md border bg-background p-2 text-sm" value={statusFilter} onChange={changeFilter(setStatusFilter)}>
              <option value="">All statuses</option><option value="active">Active</option><option value="deactivated">Deactivated</option>
            </select>
          </div>
        </div>

        {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading accounts…</p> :
          accounts.length === 0 ? <EmptyState title="No accounts found" description="Try another search term or clear the filters." /> :
          <div className="overflow-hidden rounded-lg border">
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_minmax(110px,0.6fr)] items-center gap-3 border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
              <span>Account</span><span className="text-center">Role</span><span className="text-center">Status</span><span className="text-right">Actions</span>
            </div>
            <div className="divide-y">
              {accounts.map((account) => <div key={account.id} className="grid grid-cols-1 items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_minmax(110px,0.6fr)] sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{account.full_name || account.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{account.email}{account.username ? ` · @${account.username}` : ""}</p>
                  {account.hostel && <p className="text-[11px] text-muted-foreground">{account.hostel} hostel</p>}
                </div>
                <div className="flex justify-center"><Badge variant="outline" className="text-[11px]">{account.role}</Badge></div>
                <div className="flex justify-center"><Badge variant={account.status === "active" ? "secondary" : "destructive"} className="text-[11px]">{account.status}</Badge></div>
                <div className="flex items-center justify-end">
                  {account.id !== userId && (role === "super" || account.role === "student") && <Button size="sm" variant="outline" className="h-8 px-3 text-xs" disabled={busyId === account.id} onClick={() => openAccountEditor(account)}><Pencil className="mr-1 h-3.5 w-3.5" />Edit</Button>}
                </div>
              </div>)}
            </div>
          </div>
        }
        <div className="mt-5 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {pagination.totalPages || 1} · {pagination.total || 0} accounts</p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}><ChevronLeft /> Previous</Button>
            <Button size="sm" variant="outline" disabled={!pagination.hasMore || loading} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight /></Button>
            <Button size="icon-sm" variant="ghost" disabled={loading} title="Refresh accounts" onClick={load}><RefreshCw /></Button>
          </div>
        </div>
      </SectionCard>
    </div>
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open && !editSaving) setEditTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="size-5" /></div>
            <DialogTitle>Edit account access</DialogTitle>
            <DialogDescription>Manage the password or remove this account. Changes apply immediately.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="font-semibold">{editTarget.full_name || editTarget.email}</p>
              <p className="text-sm text-muted-foreground">{editTarget.email}</p>
              <div className="mt-2 flex gap-2"><Badge variant="outline">{editTarget.role}</Badge><Badge variant="secondary">{editTarget.status}</Badge></div>
            </div>
          )}
          <form onSubmit={saveAccountPassword} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-password">New password</Label>
              <div className="relative">
                <Input id="edit-password" required minLength={8} type={showEditPassword ? "text" : "password"} autoComplete="new-password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} placeholder="At least 8 characters" className="pr-10" />
                <button type="button" onClick={() => setShowEditPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={showEditPassword ? "Hide password" : "Show password"}>{showEditPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <Input id="confirm-password" required minLength={8} type={showEditPassword ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" />
            </div>
            {editError && <p role="alert" className="text-sm text-destructive">{editError}</p>}
            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              {role === "super" && <Button type="button" variant="destructive" disabled={editSaving || busyId === editTarget?.id} onClick={deleteFromEditor}><Trash2 className="mr-1 size-4" />Delete account</Button>}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setEditTarget(null)} disabled={editSaving}>Cancel</Button>
                <Button type="submit" disabled={editSaving || !editPassword || !confirmPassword}>{editSaving ? "Saving…" : "Save password"}</Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  </>;
}
