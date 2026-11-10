import { useEffect, useState } from "react";
import { KeyRound, RefreshCw, UserPlus, UserX } from "lucide-react";
import { getAccounts, createStudentAccount, createAdminAccount, resendInvite, deactivateAccount } from "@/services/accountService";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const EMPTY = { full_name: "", email: "", username: "", usn: "", password: "", hostel: "boys", phone: "", department: "", year: 1 };

export default function CredentialsPage() {
  const { role } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [mode, setMode] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = () => getAccounts().then(setAccounts).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      if (mode === "student") {
        await createStudentAccount(form);
        setMessage("Student account created. The student can now sign in using their USN and password. No invitation email was sent.");
      } else {
        await createAdminAccount({ full_name: form.full_name, email: form.email, username: form.username, hostel: form.hostel });
        setMessage("Hostel admin account created.");
      }
      setForm(EMPTY);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return <>
    <PageHeader title="Accounts" description="Create student logins directly and manage institution accounts. Passwords are never displayed after creation.">
      <Button onClick={() => document.getElementById("account-form")?.scrollIntoView({ behavior: "smooth" })}><UserPlus /> Provision account</Button>
    </PageHeader>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
      <SectionCard title="Provision account" description="Student accounts are created immediately with an admin-set password. No invitation email is required.">
        <form id="account-form" onSubmit={submit} className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button type="button" variant={mode === "student" ? "default" : "outline"} onClick={() => setMode("student")}>Student</Button>
            {role === "super" && <Button type="button" variant={mode === "admin" ? "default" : "outline"} onClick={() => setMode("admin")}>Hostel admin</Button>}
          </div>
          <div><Label>Full name</Label><Input required value={form.full_name} onChange={(e) => update("full_name", e.target.value)} /></div>
          <div><Label>Official email</Label><Input required type="email" value={form.email} onChange={(e) => update("email", e.target.value)} /></div>
          {mode === "admin" && <div><Label>Username</Label><Input required pattern="[a-z0-9._-]{4,30}" value={form.username} onChange={(e) => update("username", e.target.value.toLowerCase())} /></div>}
          <div>
            <Label>Hostel scope</Label>
            <select className="mt-1 w-full rounded-md border bg-background p-2" value={form.hostel} onChange={(e) => update("hostel", e.target.value)}>
              <option value="boys">Boys' Hostel</option>
              <option value="girls">Girls' Hostel</option>
              {mode === "admin" && role === "super" && <option value="all">All hostels (Super Admin)</option>}
            </select>
          </div>
          {mode === "student" && <>
            <div><Label>Student ID / USN</Label><Input required value={form.usn} onChange={(e) => update("usn", e.target.value.toUpperCase())} /></div>
            <div><Label>Initial password</Label><Input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="At least 8 characters" /><p className="mt-1 text-xs text-muted-foreground">Set a permanent password for the student. It will not be emailed or shown again.</p></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>Phone</Label><Input value={form.phone} onChange={(e) => update("phone", e.target.value)} /></div>
              <div><Label>Year</Label><Input type="number" min="1" max="6" value={form.year} onChange={(e) => update("year", Number(e.target.value))} /></div>
            </div>
            <div><Label>Department</Label><Input value={form.department} onChange={(e) => update("department", e.target.value)} /></div>
          </>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-success">{message}</p>}
          <Button type="submit" disabled={loading}>
            <KeyRound />{loading ? "Creating account..." : mode === "student" ? "Create student account" : "Create hostel admin"}
          </Button>
        </form>
      </SectionCard>
      <SectionCard title="Managed accounts" description="No passwords or secret Auth metadata are shown.">
        {accounts.length === 0 ? <EmptyState title="No linked accounts" description="Provision a student or hostel administrator to begin." /> : <div className="space-y-3">
          {accounts.map((account) => <div key={account.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
            <div><p className="font-medium">{account.full_name || account.email}</p><p className="text-sm text-muted-foreground">{account.email} · @{account.username || "—"}</p></div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{account.role}</Badge><Badge variant="outline">{account.status || "active"}</Badge>
              {account.role !== "student" && <Button size="icon-sm" variant="ghost" title="Resend invitation" onClick={() => resendInvite(account.id).then(() => setMessage("Invitation resent.")).catch((e) => setError(e.message))}><RefreshCw /></Button>}
              <Button size="icon-sm" variant="ghost" title="Deactivate account" onClick={() => deactivateAccount(account.id).then(load).catch((e) => setError(e.message))}><UserX /></Button>
            </div>
          </div>)}
        </div>}
      </SectionCard>
    </div>
  </>;
}
