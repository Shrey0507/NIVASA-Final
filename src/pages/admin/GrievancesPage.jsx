import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquareWarning, Search } from "lucide-react";

import {
  addGrievanceResponse,
  getGrievances,
  updateGrievanceStatus,
} from "@/services/adminService";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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

const ALL = "all";

const formatDateTime = (iso) =>
  new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const priorityBorder = {
  high: "border-l-destructive",
  medium: "border-l-warning",
  low: "border-l-info",
};

export default function GrievancesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [category, setCategory] = useState(ALL);
  const [priority, setPriority] = useState(ALL);
  const [active, setActive] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getGrievances({
        search,
        status: status === ALL ? "" : status,
        category: category === ALL ? "" : category,
        priority: priority === ALL ? "" : priority,
      });
      setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, category, priority]);

  useEffect(() => {
    load();
  }, [load]);

  const stats = useMemo(
    () => ({
      open: items.filter((g) => g.status === "open").length,
      inProgress: items.filter((g) => g.status === "in_progress").length,
      resolved: items.filter((g) => g.status === "resolved").length,
    }),
    [items],
  );

  return (
    <>
      <PageHeader
        title="Grievances"
        description="Review, respond to and resolve resident complaints."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Open"
          value={stats.open}
          accent="bg-destructive/10 text-destructive"
        />
        <StatCard
          label="In progress"
          value={stats.inProgress}
          accent="bg-warning/10 text-warning"
        />
        <StatCard
          label="Resolved"
          value={stats.resolved}
          accent="bg-success/10 text-success"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[220px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by student or subject..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="sm:w-[140px]">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All priority</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Failed to load grievances"
          description={error}
          action={
            <Button variant="outline" onClick={load}>
              Retry
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={MessageSquareWarning}
          title="No grievances found"
          description="Complaints matching your filters will appear here."
        />
      ) : (
        <div className="space-y-3">
          {items.map((g) => (
            <button
              key={g.id}
              onClick={() => setActive(g)}
              className={cn(
                "flex w-full flex-col gap-2 rounded-xl border border-l-4 bg-card p-4 text-left transition-all hover:shadow-md",
                priorityBorder[g.priority],
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium">{g.subject}</p>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {g.priority}
                  </Badge>
                  <StatusBadge status={g.status} />
                </div>
              </div>
              <p className="line-clamp-2 text-sm text-muted-foreground">
                {g.description}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {g.studentName}
                </span>
                <span>·</span>
                <span>{g.category}</span>
                <span>·</span>
                <span>{formatDateTime(g.submittedDate)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <GrievanceDetail
        grievance={active}
        onClose={() => setActive(null)}
        onChanged={load}
      />
    </>
  );
}

function GrievanceDetail({ grievance, onClose, onChanged }) {
  const [response, setResponse] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setResponse("");
  }, [grievance]);

  if (!grievance) return null;

  const setStatus = async (status) => {
    setSaving(true);
    const updated = await updateGrievanceStatus(grievance.id, status);
    onChanged?.();
    setSaving(false);
    onClose();
    return updated;
  };

  const sendResponse = async () => {
    if (!response.trim()) return;
    setSaving(true);
    await addGrievanceResponse(grievance.id, response.trim());
    setResponse("");
    setSaving(false);
    onChanged?.();
    onClose();
  };

  return (
    <Dialog open={!!grievance} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{grievance.subject}</DialogTitle>
          <DialogDescription>
            {grievance.studentName} ({grievance.usn}) · {grievance.category} ·{" "}
            {formatDateTime(grievance.submittedDate)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {grievance.priority} priority
            </Badge>
            <StatusBadge status={grievance.status} />
          </div>

          <p className="rounded-lg bg-muted/50 p-3 text-sm">
            {grievance.description}
          </p>

          <div>
            <p className="mb-2 text-sm font-medium">
              Responses ({grievance.responses.length})
            </p>
            <div className="space-y-2">
              {grievance.responses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No responses yet.
                </p>
              ) : (
                grievance.responses.map((r) => (
                  <div key={r.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {r.respondent}
                      </span>
                      <span>{formatDateTime(r.timestamp)}</span>
                    </div>
                    <p className="mt-1 text-sm">{r.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Add a response</p>
            <Textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Type your reply to the resident..."
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={sendResponse} disabled={saving || !response.trim()}>
              Send response
            </Button>
            {grievance.status !== "in_progress" && (
              <Button
                variant="outline"
                onClick={() => setStatus("in_progress")}
                disabled={saving}
              >
                Mark in progress
              </Button>
            )}
            {grievance.status !== "resolved" && (
              <Button
                variant="secondary"
                onClick={() => setStatus("resolved")}
                disabled={saving}
              >
                Mark resolved
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
