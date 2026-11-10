import { useEffect, useState } from "react";
import { Search, RefreshCw, UserX, ChevronLeft, ChevronRight } from "lucide-react";
import { getAccounts, deactivateAccount } from "@/services/accountService";
import { useAuth } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { SectionCard } from "@/components/common/SectionCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 25;

export default function CredentialsPage() {
  const { role } = useAuth();
  const [accounts, setAccounts] = useState([]);
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
    <PageHeader title="Accounts" description="Find, review and manage institution accounts. Use search and filters to navigate large account lists." />
    <SectionCard title="Managed accounts" description={`${pagination.total || 0} account(s) found · ${PAGE_SIZE} per page`}>
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
            <option value="">All roles</option>
            <option value="student">Students</option>
            <option value="boys_admin">Boys' hostel admins</option>
            <option value="girls_admin">Girls' hostel admins</option>
            {role === "super" && <option value="super_admin">Super admins</option>}
          </select>
          <select aria-label="Filter by status" className="w-full rounded-md border bg-background p-2 text-sm" value={statusFilter} onChange={changeFilter(setStatusFilter)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
      </div>

      {error && <p className="mb-3 text-sm text-destructive">{error}</p>}
      {message && <p className="mb-3 text-sm text-success">{message}</p>}

      {loading ? <p className="py-10 text-center text-sm text-muted-foreground">Loading accounts…</p> :
        accounts.length === 0 ? <EmptyState title="No accounts found" description="Try a different search term or clear the filters." /> :
        <div className="space-y-2">
          {accounts.map((account) => <div key={account.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate font-medium">{account.full_name || account.email}</p>
              <p className="break-all text-sm text-muted-foreground">{account.email} · {account.username ? `@${account.username}` : "No username"}</p>
              <p className="mt-1 text-xs text-muted-foreground">{account.hostel ? `${account.hostel} hostel` : account.id}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{account.role}</Badge>
              <Badge variant={account.status === "active" ? "secondary" : "destructive"}>{account.status}</Badge>
              {account.status === "active" && account.id !== undefined && <Button size="sm" variant="outline" disabled={busyId === account.id || (account.role === "super_admin" && role !== "super")} onClick={() => removeAccount(account)} title="Deactivate account">
                <UserX />{busyId === account.id ? "Removing…" : "Deactivate"}
              </Button>}
            </div>
          </div>)}
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
  </>;
}
