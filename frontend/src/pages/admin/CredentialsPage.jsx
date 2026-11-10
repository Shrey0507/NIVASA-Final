import { useEffect, useState } from "react";
import { Search, RefreshCw, UserX, Trash2, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { getAccounts, createStudentAccount, createAdminAccount, deactivateAccount, permanentlyDeleteAccount } from "@/services/accountService";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 25;
const EMPTY_FORM = { full_name: "", email: "", username: "", usn: "", password: "", hostel: "boys", phone: "", department: "", year: 1 };

export default function CredentialsPage() {
  const { role } = useAuth();
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
        setMessage("Hostel administrator account created.");
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

  const removeAccount = async (account) => {
    const confirmed = window.confirm(
      `Deactivate ${account.full_name || account.email}? They will no longer be able to sign in. This can be reversed by an administrator later.`
    );
    if (!confirmed) return;
    setBusyId(account.id);
    setError("");
    setMessage("");
    try {
      await deactivateAccount(account.id);
      setMessage(`${account.full_name || account.email} has been deactivated.`);
      await load();
    } catch (e) {
      setError(e.message || "Could not deactivate account.");
    } finally {
      setBusyId("");
    }
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
          {mode === "student" && <>
            <div><Label>Student ID / USN</Label><Input required value={form.usn} onChange={(e) => updateForm("usn", e.target.value.toUpperCase())} /></div>
            <div><Label>Initial password</Label><Input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => updateForm("password", e.target.value)} placeholder="At least 8 characters" /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => updateForm("phone", e.target.value)} /></div>
              <div><Label>Year</Label><Input type="number" min="1" max="6" value={form.year} onChange={(e) => updateForm("year", Number(e.target.value))} /></div>
            </div>
            <div><Label>Department</Label><Input value={form.department} onChange={(e) => updateForm("department", e.target.value)} /></div>
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
            <div className="hidden grid-cols-[minmax(0,2fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_minmax(180px,1fr)] items-center gap-3 border-b bg-muted/30 px-3 py-2 text-xs font-medium text-muted-foreground sm:grid">
              <span>Account</span><span className="text-center">Role</span><span className="text-center">Status</span><span className="text-right">Actions</span>
            </div>
            <div className="divide-y">
              {accounts.map((account) => <div key={account.id} className="grid grid-cols-1 items-center gap-2 px-3 py-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(120px,0.8fr)_minmax(120px,0.8fr)_minmax(180px,1fr)] sm:gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{account.full_name || account.email}</p>
                  <p className="truncate text-xs text-muted-foreground">{account.email}{account.username ? ` · @${account.username}` : ""}</p>
                  {account.hostel && <p className="text-[11px] text-muted-foreground">{account.hostel} hostel</p>}
                </div>
                <div className="flex justify-center"><Badge variant="outline" className="text-[11px]">{account.role}</Badge></div>
                <div className="flex justify-center"><Badge variant={account.status === "active" ? "secondary" : "destructive"} className="text-[11px]">{account.status}</Badge></div>
                <div className="flex flex-wrap items-center justify-start gap-1 sm:justify-end">
                  {account.status === "active" && <Button size="sm" variant="ghost" className="h-8 px-2 text-xs" disabled={busyId === account.id || (account.role === "super_admin" && role !== "super")} onClick={() => removeAccount(account)} title="Deactivate account"><UserX className="h-3.5 w-3.5" />Deactivate</Button>}
                  {role === "super" && account.role !== "super_admin" && <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-destructive hover:text-destructive" disabled={busyId === account.id} onClick={() => permanentlyRemoveAccount(account)} title="Permanently delete account"><Trash2 className="h-3.5 w-3.5" />{busyId === account.id ? "Deleting…" : "Delete"}</Button>}
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
  </>;
}
