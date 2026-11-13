import { useCallback, useEffect, useMemo, useState } from "react";
import { IndianRupee, Plus, Search } from "lucide-react";

import {
  createFeeRecord,
  getFeeRecords,
  updateFeeRecord,
  getStudents,
} from "@/services/adminService";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
const inr = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

const formatDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

export default function FeesPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
    const [paymentTarget, setPaymentTarget] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFeeRecords({
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

  const totals = useMemo(() => {
    return records.reduce(
      (acc, r) => {
        acc.billed += r.amount;
        acc.paid += r.paid;
        acc.balance += r.balance;
        return acc;
      },
      { billed: 0, paid: 0, balance: 0 },
    );
  }, [records]);

  return (
    <>
      <PageHeader
        title="Fees"
        description="Track billed, collected and outstanding hostel fees."
      >
        <Button onClick={() => setShowAdd(true)}>
          <Plus /> Add fee record
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total billed" value={inr(totals.billed)} icon={IndianRupee} />
        <StatCard
          label="Collected"
          value={inr(totals.paid)}
          accent="bg-success/10 text-success"
        />
        <StatCard
          label="Outstanding"
          value={inr(totals.balance)}
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
            <SelectItem value={ALL}>All status</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>

      </div>

      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading fee records…</div>
        ) : error ? (
          <div className="p-6">
            <EmptyState
              title="Failed to load fee records"
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
              icon={IndianRupee}
              title="No fee records found"
              description="Try adjusting your filters."
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Fee type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Due date</TableHead>
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
                  <TableCell>
                    <div>Hostel Fee</div>
                    <div className="text-xs text-muted-foreground">
                      {r.term}
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {inr(r.amount)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-success">
                    {inr(r.paid)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {inr(r.balance)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(r.dueDate)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={r.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={r.balance <= 0}
                      onClick={() => setPaymentTarget(r)}
                    >
                      {r.balance <= 0 ? "Settled" : "Record payment"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <PaymentDialog
        record={paymentTarget}
        onClose={(saved) => {
          setPaymentTarget(null);
          if (saved) load();
        }}
      />

      <AddFeeDialog
        open={showAdd}
        onClose={(saved) => {
          setShowAdd(false);
          if (saved) load();
        }}
      />
    </>
  );
}

function PaymentDialog({ record, onClose }) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setAmount("");
      setError("");
    }
  }, [record]);

  if (!record) return null;

  const handleSave = async () => {
    const value = Number(amount);
    if (!value || value <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (value > record.balance) {
      setError(`Cannot exceed the balance of ${inr(record.balance)}`);
      return;
    }
    try {
      setSaving(true);
      await updateFeeRecord(record.id, {
        ...record,
        paid: record.paid + value,
      });
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!record} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {record.studentName} · {record.category} ({record.term})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between rounded-lg border p-3 text-sm">
            <span className="text-muted-foreground">Outstanding balance</span>
            <span className="font-semibold">{inr(record.balance)}</span>
          </div>
          <div className="space-y-2">
            <Label>Amount received</Label>
            <Input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Record payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddFeeDialog({ open, onClose }) {
  const [students, setStudents] = useState([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [form, setForm] = useState({ term: "", amount: "", dueDate: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStudents([]);
    setStudentsLoading(true);
    setStudentSearch("");
    setSelectedStudent(null);
    setForm({ term: "", amount: "", dueDate: "" });
    setError("");
    getStudents({ limit: 1000 })
      .then(setStudents)
      .catch((err) => setError(err.message || "Could not load students."))
      .finally(() => setStudentsLoading(false));
  }, [open]);

  const matches = students.filter((student) => {
    const term = studentSearch.trim().toLowerCase();
    if (!term) return false;
    return [student.fullName, student.usn, student.email]
      .some((value) => String(value || "").toLowerCase().includes(term));
  }).slice(0, 10);

  const handleSave = async () => {
    if (!selectedStudent) {
      setError("Select an existing student first.");
      return;
    }
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter a valid hostel fee amount.");
      return;
    }
    if (!form.dueDate) {
      setError("Choose a due date.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      await createFeeRecord({
        studentId: selectedStudent.id,
        amount,
        category: "Hostel Fee",
        dueDate: form.dueDate,
      });
      onClose(true);
    } catch (err) {
      setError(err.message || "Could not add hostel fee record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add hostel fee record</DialogTitle>
          <DialogDescription>
            Select an existing resident first, then enter the hostel fee details.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Find student</Label>
            {selectedStudent ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0">
                  <p className="font-medium">{selectedStudent.fullName}</p>
                  <p className="text-xs text-muted-foreground">{selectedStudent.usn} · {selectedStudent.email || "No email"}</p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => { setSelectedStudent(null); setStudentSearch(""); }}>
                  Change
                </Button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={studentSearch}
                  onChange={(event) => { setStudentSearch(event.target.value); setShowResults(true); }}
                  onFocus={() => setShowResults(true)}
                  placeholder="Search existing students by name, USN or email"
                  autoComplete="off"
                />
                {showResults && studentSearch.trim() && (
                  <div className="absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
                    {studentsLoading ? (
                      <p className="px-3 py-3 text-sm text-muted-foreground">Loading students…</p>
                    ) : matches.length ? matches.map((student) => (
                      <button key={student.id} type="button"
                        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                        onClick={() => { setSelectedStudent(student); setStudentSearch(""); setShowResults(false); setError(""); }}>
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{student.fullName || "Unnamed student"}</span>
                          <span className="block truncate text-xs text-muted-foreground">{student.usn} · {student.email || "No email"}</span>
                        </span>
                        <span className="ml-3 shrink-0 text-xs text-muted-foreground">{student.hostelType === "girls" ? "Girls' hostel" : "Boys' hostel"}</span>
                      </button>
                    )) : (
                      <p className="px-3 py-3 text-sm text-muted-foreground">No matching existing students.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedStudent && (
            <>
              <div className="rounded-lg border p-3 text-sm">
                <p className="font-medium">Hostel fee</p>
                <p className="text-muted-foreground">This record will be linked to {selectedStudent.fullName} ({selectedStudent.usn}).</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Billing period (optional)</Label>
                  <Input value={form.term} onChange={(e) => setForm((p) => ({ ...p, term: e.target.value }))} placeholder="e.g. 2026–27" />
                </div>
                <div className="space-y-2">
                  <Label>Amount (₹)</Label>
                  <Input type="number" min="1" value={form.amount} onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))} placeholder="45000" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Due date</Label>
                  <Input type="date" value={form.dueDate} onChange={(e) => setForm((p) => ({ ...p, dueDate: e.target.value }))} />
                </div>
              </div>
            </>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || !selectedStudent}>
            {saving ? "Saving…" : "Add hostel fee"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
