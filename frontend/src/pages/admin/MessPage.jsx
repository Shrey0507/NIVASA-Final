import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, UtensilsCrossed } from "lucide-react";

import {
  createMessMenu,
  getMessMenu,
  updateMessMenu,
} from "@/services/adminService";
import { PageHeader } from "@/components/common/PageHeader";
import { EmptyState } from "@/components/common/EmptyState";
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

const MEALS = [
  { key: "breakfast", label: "Breakfast" },
  { key: "lunch", label: "Lunch" },
  { key: "snacks", label: "Snacks" },
  { key: "dinner", label: "Dinner" },
];

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });

export default function MessPage() {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMessMenu();
      setMenu(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Mess"
        description="Publish and manage the daily mess menu for residents."
      >
        <Button onClick={() => setEditing("new")}>
          <Plus /> Add menu day
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Failed to load the mess menu"
          description={error}
          action={
            <Button variant="outline" onClick={load}>
              Retry
            </Button>
          }
        />
      ) : menu.length === 0 ? (
        <EmptyState
          icon={UtensilsCrossed}
          title="No menu published"
          description="Add the first day of the mess menu to get started."
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus /> Add menu day
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {menu.map((day) => (
            <div key={day.id} className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{day.day}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(day.date)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditing(day)}
                >
                  <Pencil /> Edit
                </Button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {MEALS.map((meal) => {
                  const section = day[meal.key];
                  if (!section) return null;
                  return (
                    <div key={meal.key} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{meal.label}</p>
                        <span className="text-[11px] text-muted-foreground">
                          {section.time}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-muted-foreground">
                        {section.items.join(" · ")}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <MenuDialog
        target={editing}
        onClose={(saved) => {
          setEditing(null);
          if (saved) load();
        }}
      />
    </>
  );
}

function emptyForm() {
  return {
    day: "",
    date: new Date().toISOString().split("T")[0],
    breakfast: { items: "", time: "7:00 AM - 9:00 AM" },
    lunch: { items: "", time: "12:00 PM - 2:00 PM" },
    snacks: { items: "", time: "4:00 PM - 5:00 PM" },
    dinner: { items: "", time: "7:00 PM - 9:00 PM" },
  };
}

function MenuDialog({ target, onClose }) {
  const isNew = target === "new";
  const [form, setForm] = useState(emptyForm());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    setError("");
    if (isNew) {
      setForm(emptyForm());
    } else {
      const toForm = (section) => ({
        items: (section?.items || []).join(", "),
        time: section?.time || "",
      });
      setForm({
        day: target.day,
        date: target.date,
        breakfast: toForm(target.breakfast),
        lunch: toForm(target.lunch),
        snacks: toForm(target.snacks),
        dinner: toForm(target.dinner),
      });
    }
  }, [target, isNew]);

  if (!target) return null;

  const updateMeal = (meal, field, value) =>
    setForm((p) => ({ ...p, [meal]: { ...p[meal], [field]: value } }));

  const handleSave = async () => {
    if (!form.day.trim()) {
      setError("A day label is required");
      return;
    }
    const payload = {
      day: form.day,
      date: form.date,
      breakfast: {
        items: splitItems(form.breakfast.items),
        time: form.breakfast.time,
      },
      lunch: { items: splitItems(form.lunch.items), time: form.lunch.time },
      snacks: { items: splitItems(form.snacks.items), time: form.snacks.time },
      dinner: { items: splitItems(form.dinner.items), time: form.dinner.time },
    };
    try {
      setSaving(true);
      if (isNew) await createMessMenu(payload);
      else await updateMessMenu(target.id, payload);
      onClose(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose(false)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isNew ? "Add menu day" : "Edit menu"}</DialogTitle>
          <DialogDescription>
            Set the meals and timings for this day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Day label</Label>
              <Input
                value={form.day}
                onChange={(e) => setForm((p) => ({ ...p, day: e.target.value }))}
                placeholder="Monday"
              />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((p) => ({ ...p, date: e.target.value }))
                }
              />
            </div>
          </div>

          {MEALS.map((meal) => (
            <div key={meal.key} className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">{meal.label}</p>
              <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                <Input
                  value={form[meal.key].items}
                  onChange={(e) =>
                    updateMeal(meal.key, "items", e.target.value)
                  }
                  placeholder="Comma-separated items"
                />
                <Input
                  value={form[meal.key].time}
                  onChange={(e) => updateMeal(meal.key, "time", e.target.value)}
                  placeholder="Timing"
                />
              </div>
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : isNew ? "Add menu" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function splitItems(value) {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
