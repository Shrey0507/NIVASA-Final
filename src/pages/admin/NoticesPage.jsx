import { useCallback, useEffect, useState } from "react";
import { Bell, Pencil, Plus, Search, Trash2 } from "lucide-react";

import {
  createNotice,
  deleteNotice,
  getNotices,
  updateNotice,
} from "@/services/adminService";
import { PageHeader } from "@/components/common/PageHeader";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const ALL = "all";

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default function NoticesPage() {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState(ALL);
  const [audience, setAudience] = useState(ALL);
  const [editing, setEditing] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getNotices({
        search,
        status: status === ALL ? "" : status,
        audience: audience === ALL ? "" : audience,
      });
      setNotices(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [search, status, audience]);

  useEffect(() => {
    load();
  }, [load]);

  const confirmDelete = async () => {
    setDeleting(true);
    await deleteNotice(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    load();
  };

  return (
    <>
      <PageHeader
        title="Notices"
        description="Publish announcements for residents."
      >
        <Button onClick={() => setEditing("new")}>
          <Plus /> New notice
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 sm:min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search notices..."
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
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
          </SelectContent>
        </Select>
        <Select value={audience} onValueChange={setAudience}>
          <SelectTrigger className="sm:w-[160px]">
            <SelectValue placeholder="Audience" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All audiences</SelectItem>
            <SelectItem value="all">Everyone</SelectItem>
            <SelectItem value="boys">Boys' Hostel</SelectItem>
            <SelectItem value="girls">Girls' Hostel</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Failed to load notices"
          description={error}
          action={
            <Button variant="outline" onClick={load}>
              Retry
            </Button>
          }
        />
      ) : notices.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="No notices found"
          description="Create a notice to inform residents."
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus /> New notice
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {notices.map((n) => (
            <div
              key={n.id}
              className="flex flex-col gap-3 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="font-semibold">{n.title}</p>
                <StatusBadge status={n.status} />
              </div>
              <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">
                {n.body}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="capitalize">
                    {n.audience === "all" ? "Everyone" : n.audience}
                  </Badge>
                  <span>{formatDate(n.publishDate)}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setEditing(n)}
                    aria-label="Edit notice"
                  >
                    <Pencil />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(n)}
                    aria-label="Delete notice"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <NoticeDialog
        target={editing}
        onClose={(saved) => {
          setEditing(null);
          if (saved) load();
        }}
      />

      {deleteTarget && (
        <ConfirmDialog
          title="Delete notice"
          description={
            <p>
              Delete <strong>{deleteTarget.title}</strong>? This cannot be
              undone.
            </p>
          }
          confirmLabel="Delete"
          variant="destructive"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

function NoticeDialog({ target, onClose }) {
  const isNew = target === "new";
  const [form, setForm] = useState({
    title: "",
    body: "",
    audience: "all",
    status: "published",
    expiryDate: "",
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setError("");
    if (isNew) {
      setForm({
        title: "",
        body: "",
        audience: "all",
        status: "published",
        expiryDate: "",
      });
    } else {
      setForm({
        title: target.title,
        body: target.body,
        audience: target.audience,
        status: target.status,
        expiryDate: target.expiryDate || "",
      });
    }
  }, [target, isNew]);

  if (!target) return null;

  const update = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      setError("Title and body are required");
      return;
    }
    try {
      setSaving(true);
      if (isNew) await createNotice(form);
      else await updateNotice(target.id, form);
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "New notice" : "Edit notice"}</DialogTitle>
          <DialogDescription>
            {isNew
              ? "Compose an announcement for residents."
              : "Update the contents of this notice."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="Semester fee deadline"
            />
          </div>
          <div className="space-y-2">
            <Label>Body</Label>
            <Textarea
              value={form.body}
              onChange={(e) => update("body", e.target.value)}
              placeholder="Write the notice content..."
              className="min-h-28"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select
                value={form.audience}
                onValueChange={(v) => update("audience", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Everyone</SelectItem>
                  <SelectItem value="boys">Boys' Hostel</SelectItem>
                  <SelectItem value="girls">Girls' Hostel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => update("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expiry date</Label>
              <Input
                type="date"
                value={form.expiryDate || ""}
                onChange={(e) => update("expiryDate", e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Publish" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
