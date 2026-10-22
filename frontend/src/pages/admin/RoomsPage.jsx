import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, Search } from "lucide-react";

import { getRooms } from "@/services/adminService";
import { PageHeader } from "@/components/common/PageHeader";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ALL = "all";

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hostel, setHostel] = useState("boys");
  const [floor, setFloor] = useState(ALL);
  const [block, setBlock] = useState(ALL);
  const [availability, setAvailability] = useState(ALL);
  const [search, setSearch] = useState("");
  const [selectedRoom, setSelectedRoom] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getRooms({
        hostel,
        floor: floor === ALL ? "" : floor,
        block: block === ALL ? "" : block,
        availability: availability === ALL ? "" : availability,
        search,
      });
      setRooms(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [hostel, floor, block, availability, search]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useMemo(() => {
    const total = rooms.length;
    const beds = rooms.reduce((s, r) => s + r.capacity, 0);
    const occupied = rooms.reduce((s, r) => s + r.occupied, 0);
    const available = rooms.filter((r) => r.occupied < r.capacity).length;
    return {
      total,
      beds,
      occupied,
      available,
      pct: beds ? Math.round((occupied / beds) * 100) : 0,
    };
  }, [rooms]);

  return (
    <>
      <PageHeader
        title="Rooms"
        description="Browse buildings, floors and blocks across the hostel."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rooms (filtered)" value={summary.total} icon={BedDouble} />
        <StatCard label="Total beds" value={summary.beds} />
        <StatCard
          label="Occupied beds"
          value={summary.occupied}
          hint={`${summary.pct}% full`}
          accent="bg-primary/10 text-primary"
        />
        <StatCard
          label="Rooms available"
          value={summary.available}
          hint="with free beds"
          accent="bg-success/10 text-success"
        />
      </div>

      <div className="flex flex-col gap-3">
        <Tabs value={hostel} onValueChange={setHostel}>
          <TabsList>
            <TabsTrigger value="boys">Boys' Hostel</TabsTrigger>
            <TabsTrigger value="girls">Girls' Hostel</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative flex-1 sm:min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search room number..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={floor} onValueChange={setFloor}>
            <SelectTrigger className="sm:w-[140px]">
              <SelectValue placeholder="Floor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All floors</SelectItem>
              {[1, 2, 3, 4].map((f) => (
                <SelectItem key={f} value={String(f)}>
                  Floor {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={block} onValueChange={setBlock}>
            <SelectTrigger className="sm:w-[140px]">
              <SelectValue placeholder="Block" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All blocks</SelectItem>
              {["A", "B", "C"].map((b) => (
                <SelectItem key={b} value={b}>
                  Block {b}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger className="sm:w-[170px]">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All rooms</SelectItem>
              <SelectItem value="available">Has free beds</SelectItem>
              <SelectItem value="full">Full</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="Failed to load rooms"
          description={error}
          action={
            <Button variant="outline" onClick={load}>
              Retry
            </Button>
          }
        />
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="No rooms match your filters"
          description="Try changing the floor, block or availability."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rooms.map((room) => (
            <RoomCard key={room.id} room={room} onClick={setSelectedRoom} />
          ))}
        </div>
      )}

      <RoomDetailDialog room={selectedRoom} onClose={() => setSelectedRoom(null)} />
    </>
  );
}

function RoomCard({ room, onClick }) {
  const pct = Math.round((room.occupied / room.capacity) * 100);
  const full = room.occupied >= room.capacity;

  return (
    <button
      onClick={() => onClick(room)}
      className={cn(
        "group flex flex-col gap-3 rounded-xl border bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg font-semibold tracking-tight">
          {room.number}
        </span>
        <Badge variant={full ? "destructive" : "success"}>
          {full ? "Full" : `${room.capacity - room.occupied} free`}
        </Badge>
      </div>
      <div className="text-xs text-muted-foreground">
        Floor {room.floor} · Block {room.block}
      </div>
      <div className="space-y-1.5">
        <Progress value={pct} />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Occupancy</span>
          <span className="tabular-nums">
            {room.occupied}/{room.capacity}
          </span>
        </div>
      </div>
    </button>
  );
}

function RoomDetailDialog({ room, onClose }) {
  if (!room) return null;
  const pct = Math.round((room.occupied / room.capacity) * 100);

  return (
    <Dialog open={!!room} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Room {room.number}</DialogTitle>
          <DialogDescription>
            Floor {room.floor} · Block {room.block} ·{" "}
            {room.hostel === "boys" ? "Boys' Hostel" : "Girls' Hostel"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Occupancy</span>
              <span className="font-medium tabular-nums">
                {room.occupied}/{room.capacity} beds
              </span>
            </div>
            <Progress value={pct} className="mt-2" />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Beds</p>
            <div className="space-y-2">
              {Array.from({ length: room.capacity }).map((_, i) => {
                const occupied = i < room.occupied;
                return (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                  >
                    <span>Bed {String.fromCharCode(65 + i)}</span>
                    <Badge variant={occupied ? "secondary" : "success"}>
                      {occupied ? "Occupied" : "Available"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Allocation changes are managed through the Students module in this
            prototype.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
