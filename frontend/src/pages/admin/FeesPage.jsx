import { useCallback, useEffect, useMemo, useState } from "react";
import { IndianRupee, Plus, Search } from "lucide-react";

import {
  createFeeRecord,
  getFeeRecords,
  updateFeeRecord,
} from "@/services/adminService";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [category, setCategory] = useState(ALL);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getFeeRecords({
        search,
        status: status === ALL ? "" : status,
        category: category === ALL ? "" : category,
      });
      setRecords(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, category]);

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
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-[180px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            <SelectItem value="Semester Fee">Semester Fee</SelectItem>
            <SelectItem value="Hostel Fee">Hostel Fee</SelectItem>
            <SelectItem value="Mess Fee">Mess Fee</SelectItem>
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
                <TableHead>Category</TableHead>
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
                    <div>{r.category}</div>
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
  const [form, setForm] = useState({
    studentName: "",
    usn: "",
    category: "Semester Fee",
    term: "",
    amount: "",
    dueDate: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        studentName: "",
        usn: "",
        category: "Semester Fee",
        term: "",
        amount: "",
        dueDate: "",
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
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError("Enter a valid amount");
      return;
    }
    try {
      setSaving(true);
      await createFeeRecord({
        ...form,
        amount,
        studentId: Date.now(),
        paid: 0,
        dueDate: form.dueDate || new Date().toISOString().split("T")[0],
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
          <DialogTitle>Add fee record</DialogTitle>
          <DialogDescription>
            Create a new billed fee entry for a resident.
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
            <Label>Category</Label>
            <Select
              value={form.category}
              onValueChange={(v) => update("category", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Semester Fee">Semester Fee</SelectItem>
                <SelectItem value="Hostel Fee">Hostel Fee</SelectItem>
                <SelectItem value="Mess Fee">Mess Fee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Input
              value={form.term}
              onChange={(e) => update("term", e.target.value)}
              placeholder="Semester 5"
            />
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              value={form.amount}
              onChange={(e) => update("amount", e.target.value)}
              placeholder="45000"
            />
          </div>
          <div className="space-y-2">
            <Label>Due date</Label>
            <Input
              type="date"
              value={form.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Add record"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
