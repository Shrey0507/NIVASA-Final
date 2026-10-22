import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeftRight,
  LogOut,
  Search,
  ClipboardList,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

import {
  createMovementRecord,
  getMovementRecords,
  updateMovementRecord,
} from "@/services/adminService";
import {
  getMovementRequests,
  approveRequest,
  rejectRequest,
} from "@/services/movementRequestService";
import { useAuth, ADMIN_ROLES } from "@/hooks/useAuth";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionCard } from "@/components/common/SectionCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ALL = "all";

const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

/* ─── Incoming Requests Section ────────────────────────────────────────── */

function IncomingRequests() {
  const { hostel, role, user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMovementRequests({
        hostel: role === "super" ? undefined : hostel,
      });
      setRequests(data);
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  }, [hostel, role]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const pendingRequests = requests.filter((r) => r.status === "pending");
  const recentReviewed = requests
    .filter((r) => r.status === "approved" || r.status === "rejected")
    .slice(0, 5);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      const reviewerName = ADMIN_ROLES[role]?.label ?? user ?? "Admin";
      await approveRequest(id, "", reviewerName);
      await loadRequests();
    } catch {
      // silently handle
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      const reviewerName = ADMIN_ROLES[role]?.label ?? user ?? "Admin";
      await rejectRequest(id, "", reviewerName);
      await loadRequests();
    } catch {
      // silently handle
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status) => {
    switch (status) {
      case "approved":
        return <Badge variant="success">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "pending":
        return <Badge variant="warning">Pending</Badge>;
      case "cancelled":
        return <Badge variant="secondary">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <SectionCard title="Incoming movement requests" description="Student in/out requests awaiting your review">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Incoming movement requests"
      description="Student in/out requests awaiting your review"
      action={
        <Badge variant={pendingRequests.length > 0 ? "warning" : "secondary"}>
          {pendingRequests.length} pending
        </Badge>
      }
    >
      {pendingRequests.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up"
          description="No pending movement requests."
        />
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-warning/20 bg-warning/5 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{req.studentName}</p>
                  <Badge variant="outline" className="text-[10px]">
                    {req.type === "exit" ? "Exit" : "Entry"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] capitalize">
                    {req.hostel}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {req.usn} · Room {req.room} · {req.reason}
                </p>
                <p className="text-xs text-muted-foreground">
                  Requested for: {formatDateTime(req.requestedDateTime)} ·
                  Submitted: {formatDateTime(req.submittedAt)}
                </p>
                {req.remarks && (
                  <p className="mt-1 text-xs italic text-muted-foreground">
                    "{req.remarks}"
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => handleReject(req.id)}
                  disabled={actionLoading === req.id}
                >
                  <XCircle className="mr-1 size-3.5" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  className="bg-success text-success-foreground hover:bg-success/90"
                  onClick={() => handleApprove(req.id)}
                  disabled={actionLoading === req.id}
                >
                  <CheckCircle2 className="mr-1 size-3.5" />
                  Approve
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {recentReviewed.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recently reviewed
          </p>
          <div className="space-y-2">
            {recentReviewed.map((req) => (
              <div
                key={req.id}
                className="flex items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{req.studentName}</p>
                  <p className="text-xs text-muted-foreground">
                    {req.reason} · {formatDateTime(req.requestedDateTime)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(req.status)}
                  <span className="text-[10px] text-muted-foreground">
                    {formatDateTime(req.reviewedAt)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

/* ─── Main Movements Page ──────────────────────────────────────────────── */

export default function MovementsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMovementRecords({
        search,
        status: status === ALL ? "" : status,
      });
      setRecords(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(() => {
    const out = records.filter((r) => r.status === "out").length;
    const returned = records.filter((r) => r.status === "returned").length;
    const overdue = records.filter(
      (r) =>
        r.status === "out" &&
        r.expectedReturn &&
        new Date(r.expectedReturn) < new Date(),
    ).length;
    return { out, returned, overdue };
  }, [records]);

  const markReturned = async (record) => {
    await updateMovementRecord(record.id, {
      status: "returned",
      actualReturn: new Date().toISOString(),
    });
    load();
  };

  return (
    <>
      <PageHeader
        title="In / Out Register"
        description="Track every hostel exit and return, and review student movement requests."
      >
        <Button onClick={() => setShowAdd(true)}>
          <LogOut />Record exit
        </Button>
      </PageHeader>

      {/* ── Incoming requests section ── */}
      <IncomingRequests />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Currently out"
          value={stats.out}
          hint="residents away"
          accent="bg-warning/10 text-warning"
          icon={ArrowLeftRight}
        />
        <StatCard label="Returned" value={stats.returned} />
        <StatCard
          label="Overdue returns"
          value={stats.overdue}
          accent="bg-destructive/10 text-destructive"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student or USN..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All</SelectItem>
            <SelectItem value="out">Out</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <EmptyState
              title="Failed to load the register"
              description={error}
              action={
                <Button variant="outline" onClick={load}>
                  Retry
                </Button>
              }
            />
          </div>
        ) : records.length === 0 ? (
          <div className="p-6">
            <EmptyState
              icon={ArrowLeftRight}
              title="No movement records"
              description="Exits and returns will appear here."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Departure</TableHead>
                <TableHead>Expected return</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="font-medium">{r.studentName}</div>
                    <div className="font-mono text-xs text-muted-foreground">
                      {r.usn}
                    </div>
                  </TableCell>
                  <TableCell>{r.room || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.reason}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(r.departureTime)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDateTime(r.expectedReturn)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    {r.status === "out" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markReturned(r)}
                      >
                        Mark returned
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(r.actualReturn)}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <AddMovementDialog
        open={showAdd}
        onClose={(saved) => {
          setShowAdd(false);
          if (saved) load();
        }}
      />
    </>
  );
}

function AddMovementDialog({ open, onClose }) {
  const [form, setForm] = useState({
    studentName: "",
    usn: "",
    room: "",
    reason: "",
    expectedReturn: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        studentName: "",
        usn: "",
        room: "",
        reason: "",
        expectedReturn: "",
      });
      setError("");
    }
  }, [open]);

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.studentName.trim() || !form.usn.trim()) {
      setError("Student name and USN are required");
      return;
    }
    try {
      setSaving(true);
      await createMovementRecord({
        ...form,
        hostel: "",
        departureTime: new Date().toISOString(),
        expectedReturn: form.expectedReturn
          ? new Date(form.expectedReturn).toISOString()
          : null,
      });
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Record exit</DialogTitle>
          <DialogDescription>
            Log a resident leaving the hostel.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Student name</Label>
            <Input
              value={form.studentName}
              onChange={(e) => update("studentName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>USN</Label>
            <Input
              value={form.usn}
              onChange={(e) => update("usn", e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label>Room</Label>
            <Input
              value={form.room}
              onChange={(e) => update("room", e.target.value)}
              placeholder="B-101"
            />
          </div>
          <div className="space-y-2">
            <Label>Expected return</Label>
            <Input
              type="datetime-local"
              value={form.expectedReturn}
              onChange={(e) => update("expectedReturn", e.target.value)}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Reason</Label>
            <Input
              value={form.reason}
              onChange={(e) => update("reason", e.target.value)}
              placeholder="Home visit"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Record exit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
