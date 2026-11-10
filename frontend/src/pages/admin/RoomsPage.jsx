import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Plus,
  Search,
  Users,
  Building2,
  CheckCircle2,
  UserPlus,
  UserRoundX,
  RefreshCw,
  DoorOpen,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

import { getRooms, createRoom, getStudents, getRoomAllocations, allocateRoom, deallocateRoom } from "@/services/adminService";
import { PageHeader } from "@/components/common/PageHeader";
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

const EMPTY_ROOM = {
  room_number: "",
  hostel: "boys",
  floor: "0",
  block: "A",
  capacity: "2",
};

export default function RoomsPage() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hostel, setHostel] = useState("boys");

  const [floor, setFloor] = useState(ALL);
  const [block, setBlock] = useState(ALL);
  const [availability, setAvailability] = useState(ALL);
  const [search, setSearch] = useState("");

  const [selectedRoom, setSelectedRoom] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [newRoom, setNewRoom] = useState(EMPTY_ROOM);
  const [roomAllocations, setRoomAllocations] = useState([]);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [allocationLoading, setAllocationLoading] = useState(false);
  const [allocationSaving, setAllocationSaving] = useState(false);
  const [allocationError, setAllocationError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getRooms({
        hostel,
        floor: floor === ALL ? "" : floor,
        block: block === ALL ? "" : block,
        availability: availability === ALL ? "" : availability,
        search: search.trim(),
      });

      setRooms(Array.isArray(data) ? data : []);
      setSelectedRoom((current) => current ? (data.find((item) => item.id === current.id) || current) : current);
    } catch (err) {
      setError(err.message || "Unable to load rooms.");
    } finally {
      setLoading(false);
    }
  }, [hostel, floor, block, availability, search]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedRoom) {
      setRoomAllocations([]);
      setEligibleStudents([]);
      setSelectedStudentId("");
      setStudentSearch("");
      setAllocationError("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        setAllocationLoading(true);
        setAllocationError("");
        const [assignments, students] = await Promise.all([
          getRoomAllocations(selectedRoom.id),
          getStudents({ hostel: selectedRoom.hostel, limit: 1000 }),
        ]);
        if (cancelled) return;
        setRoomAllocations(assignments);
        setEligibleStudents((students || []).filter((student) =>
          student.status === "active" && !student.roomId && !student.room_id
        ));
      } catch (err) {
        if (!cancelled) setAllocationError(err.message || "Unable to load room assignments.");
      } finally {
        if (!cancelled) setAllocationLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedRoom?.id, selectedRoom?.hostel]);

  const summary = useMemo(() => {
    const total = rooms.length;
    const beds = rooms.reduce(
      (sum, room) => sum + Number(room.capacity || 0),
      0
    );
    const occupied = rooms.reduce(
      (sum, room) => sum + Number(room.occupied || 0),
      0
    );
    const available = rooms.filter(
      (room) =>
        Number(room.occupied || 0) < Number(room.capacity || 0)
    ).length;

    return {
      total,
      beds,
      occupied,
      available,
      pct: beds ? Math.round((occupied / beds) * 100) : 0,
    };
  }, [rooms]);

  const blocks = useMemo(
    () =>
      [...new Set(rooms.map((room) => room.block).filter(Boolean))].sort(),
    [rooms]
  );

  const floors = useMemo(
    () =>
      [
        ...new Set(
          rooms.map((room) => String(room.floor ?? 0))
        ),
      ].sort((a, b) => Number(a) - Number(b)),
    [rooms]
  );

  const handleCreateRoom = async (event) => {
    event.preventDefault();
    setFormError("");

    const roomNumber = newRoom.room_number.trim();
    const floorNumber = Number(newRoom.floor);
    const capacityNumber = Number(newRoom.capacity);

    if (!roomNumber) {
      setFormError("Room number is required.");
      return;
    }

    if (!Number.isInteger(floorNumber) || floorNumber < 0) {
      setFormError("Please enter a valid floor.");
      return;
    }

    if (
      !Number.isInteger(capacityNumber) ||
      capacityNumber < 1 ||
      capacityNumber > 10
    ) {
      setFormError("Bed capacity must be between 1 and 10.");
      return;
    }

    try {
      setSaving(true);

      await createRoom({
        room_number: roomNumber,
        hostel: newRoom.hostel,
        floor: floorNumber,
        block: newRoom.block.trim() || "A",
        capacity: capacityNumber,
      });

      setAddOpen(false);
      setNewRoom({ ...EMPTY_ROOM, hostel });
      setFormError("");

      await load();
    } catch (err) {
      setFormError(err.message || "Unable to create room.");
    } finally {
      setSaving(false);
    }
  };

  const openAddDialog = () => {
    setFormError("");
    setNewRoom({ ...EMPTY_ROOM, hostel });
    setAddOpen(true);
  };

  const filteredEligibleStudents = eligibleStudents.filter((student) => {
    const term = studentSearch.trim().toLowerCase();
    return !term || [student.fullName, student.full_name, student.usn, student.email]
      .some((value) => String(value || "").toLowerCase().includes(term));
  });

  const refreshAssignments = async () => {
    if (!selectedRoom) return;
    try {
      setAllocationLoading(true);
      const [assignments, students] = await Promise.all([
        getRoomAllocations(selectedRoom.id),
        getStudents({ hostel: selectedRoom.hostel, limit: 200 }),
      ]);
      setRoomAllocations(assignments);
      setEligibleStudents((students || []).filter((student) =>
        student.status === "active" && !student.roomId && !student.room_id
      ));
      await load();
    } catch (err) {
      setAllocationError(err.message || "Unable to refresh assignments.");
    } finally {
      setAllocationLoading(false);
    }
  };

  const handleAssignStudent = async () => {
    if (!selectedRoom || !selectedStudentId) return;
    try {
      setAllocationSaving(true);
      setAllocationError("");
      await allocateRoom(selectedStudentId, selectedRoom.id);
      setSelectedStudentId("");
      await refreshAssignments();
    } catch (err) {
      setAllocationError(err.message || "Unable to assign student.");
    } finally {
      setAllocationSaving(false);
    }
  };

  const handleDeallocateStudent = async (allocationId) => {
    if (!window.confirm("Remove this student's room assignment?")) return;
    try {
      setAllocationSaving(true);
      setAllocationError("");
      await deallocateRoom(allocationId);
      await refreshAssignments();
    } catch (err) {
      setAllocationError(err.message || "Unable to remove room assignment.");
    } finally {
      setAllocationSaving(false);
    }
  };

  const getRoomStatus = (room) => {
    const occupied = Number(room.occupied || 0);
    const capacity = Number(room.capacity || 0);

    if (capacity > 0 && occupied >= capacity) return "Full";
    if (occupied > 0) return "Partially occupied";
    return "Available";
  };

  const getStatusClass = (status) => {
    if (status === "Full") return "bg-red-100 text-red-700";
    if (status === "Partially occupied") {
      return "bg-amber-100 text-amber-700";
    }
    return "bg-green-100 text-green-700";
  };

  return (
    <div className="space-y-7 pb-6">
      <PageHeader
        title="Room Management"
        description="Manage hostel rooms, occupancy and bed availability."
      />

      {/* Hostel overview and primary action */}
      <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-card via-card to-primary/10 p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" /> Hostel overview
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                {hostel === "boys" ? "Boys' Hostel" : "Girls' Hostel"}
              </h2>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                A clear view of rooms, beds and student occupancy across your selected hostel.
              </p>
            </div>
            <Tabs
              value={hostel}
              onValueChange={(value) => {
                setHostel(value);
                setFloor(ALL);
                setBlock(ALL);
                setAvailability(ALL);
              }}
            >
              <TabsList className="h-11 rounded-xl bg-background/80 p-1">
                <TabsTrigger className="rounded-lg px-5" value="boys">Boys Hostel</TabsTrigger>
                <TabsTrigger className="rounded-lg px-5" value="girls">Girls Hostel</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col lg:items-end">
            <div className="rounded-2xl border border-border/70 bg-background/70 px-4 py-3 text-sm backdrop-blur">
              <p className="text-xs text-muted-foreground">Current occupancy</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{summary.pct}%</p>
              <p className="text-xs text-muted-foreground">{summary.occupied} occupied of {summary.beds} beds</p>
            </div>
            <Button onClick={openAddDialog} size="lg" className="h-11 rounded-xl px-5 shadow-sm">
              <Plus className="mr-2 h-4 w-4" /> Add a room
            </Button>
          </div>
        </div>
      </section>

      {/* Key metrics */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "Total rooms", value: summary.total, note: "Registered rooms", icon: Building2, tone: "text-sky-500 bg-sky-500/10" },
          { label: "Bed capacity", value: summary.beds, note: "Total available beds", icon: BedDouble, tone: "text-violet-500 bg-violet-500/10" },
          { label: "Occupied beds", value: summary.occupied, note: "Currently assigned", icon: Users, tone: "text-amber-500 bg-amber-500/10" },
          { label: "Rooms with vacancy", value: summary.available, note: "At least one free bed", icon: CheckCircle2, tone: "text-emerald-500 bg-emerald-500/10" },
        ].map((metric) => {
          const MetricIcon = metric.icon;
          return (
            <div key={metric.label} className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-md sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.label}</p>
                  <p className="mt-2 text-3xl font-bold tracking-tight tabular-nums">{metric.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
                </div>
                <span className={cn("rounded-xl p-3", metric.tone)}><MetricIcon className="h-5 w-5" /></span>
              </div>
            </div>
          );
        })}
      </section>

      {/* Occupancy at a glance */}
      <section className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-primary" />
              <h3 className="font-semibold">Bed occupancy</h3>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.occupied} occupied · {Math.max(summary.beds - summary.occupied, 0)} vacant across {summary.total} rooms
            </p>
          </div>
          <p className="text-3xl font-bold tracking-tight tabular-nums">{summary.pct}<span className="text-base text-muted-foreground">%</span></p>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-gradient-to-r from-primary/70 to-primary transition-all duration-500" style={{ width: `${summary.pct}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>0 beds occupied</span><span>{summary.beds} total beds</span>
        </div>
      </section>

      {/* Search and filters */}
      <section className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Find a room</h3>
          <span className="ml-auto text-xs text-muted-foreground">{rooms.length} shown</span>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_160px_160px_190px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by room number..." className="h-11 rounded-xl pl-9" />
          </div>
          <Select value={floor} onValueChange={setFloor}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="All floors" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All floors</SelectItem>{floors.map((value) => <SelectItem key={value} value={value}>Floor {value}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={block} onValueChange={setBlock}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="All blocks" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>All blocks</SelectItem>{blocks.map((value) => <SelectItem key={value} value={value}>Block {value}</SelectItem>)}</SelectContent>
          </Select>
          <Select value={availability} onValueChange={setAvailability}>
            <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="Any availability" /></SelectTrigger>
            <SelectContent><SelectItem value={ALL}>Any availability</SelectItem><SelectItem value="available">Has vacant beds</SelectItem><SelectItem value="occupied">Partially occupied</SelectItem><SelectItem value="full">Full</SelectItem></SelectContent>
          </Select>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{error}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={load}
          >
            Try again
          </Button>
        </div>
      )}

      {/* Room cards */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : !error && rooms.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/50 px-6 py-16 text-center shadow-sm">
          <BedDouble className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No rooms found</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            There are no rooms matching this view. Add a room or adjust your filters to see more results.
          </p>
          <Button className="mt-4" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        </div>
      ) : !error ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rooms.map((room) => {
            const occupied = Number(room.occupied || 0);
            const capacity = Number(room.capacity || 0);
            const vacant = Math.max(capacity - occupied, 0);
            const percentage = capacity
              ? Math.round((occupied / capacity) * 100)
              : 0;
            const status = getRoomStatus(room);

            return (
              <div
                key={room.id || room.room_number || room.number}
                className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Room number
                    </p>
                    <h3 className="mt-1 text-3xl font-bold tracking-tight">
                      {room.number || room.room_number}
                    </h3>
                  </div>
                  <Badge className={cn("border-0", getStatusClass(status))}>
                    {status}
                  </Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-muted px-2 py-1">
                    Floor {room.floor ?? 0}
                  </span>
                  <span className="rounded-md bg-muted px-2 py-1">
                    Block {room.block || "A"}
                  </span>
                </div>

                <div className="mt-5 rounded-xl border border-border/60 bg-muted/30 p-3.5">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Bed occupancy
                    </span>
                    <span className="font-medium">
                      {occupied}/{capacity}
                    </span>
                  </div>
                  <Progress value={percentage} />
                  <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                    <span>{occupied} occupied</span>
                    <span>{vacant} vacant</span>
                  </div>
                </div>

                <Button
                  variant="default"
                  className="mt-4 h-10 w-full rounded-xl"
                  onClick={() => setSelectedRoom(room)}
                >
                  View Room Details
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Add Room Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
            <DialogDescription>
              Enter the room information to add it to the hostel.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Room Number</label>
              <Input
                value={newRoom.room_number}
                onChange={(event) =>
                  setNewRoom((previous) => ({
                    ...previous,
                    room_number: event.target.value,
                  }))
                }
                placeholder="Example: 101"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Hostel</label>
              <Select
                value={newRoom.hostel}
                onValueChange={(value) =>
                  setNewRoom((previous) => ({
                    ...previous,
                    hostel: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select hostel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boys">Boys Hostel</SelectItem>
                  <SelectItem value="girls">Girls Hostel</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Floor</label>
                <Input
                  type="number"
                  min="0"
                  value={newRoom.floor}
                  onChange={(event) =>
                    setNewRoom((previous) => ({
                      ...previous,
                      floor: event.target.value,
                    }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Block</label>
                <Input
                  value={newRoom.block}
                  onChange={(event) =>
                    setNewRoom((previous) => ({
                      ...previous,
                      block: event.target.value,
                    }))
                  }
                  placeholder="A"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Bed Capacity</label>
              <Input
                type="number"
                min="1"
                max="10"
                value={newRoom.capacity}
                onChange={(event) =>
                  setNewRoom((previous) => ({
                    ...previous,
                    capacity: event.target.value,
                  }))
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Enter a number between 1 and 10.
              </p>
            </div>

            {formError && (
              <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {formError}
              </p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Creating..." : "Create Room"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Room Details Dialog */}
      <Dialog
        open={Boolean(selectedRoom)}
        onOpenChange={(open) => {
          if (!open) setSelectedRoom(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          {selectedRoom && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Room {selectedRoom.number || selectedRoom.room_number}
                </DialogTitle>
                <DialogDescription>
                  Room occupancy and availability details.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground">Floor</p>
                    <p className="mt-1 text-lg font-semibold">
                      {selectedRoom.floor ?? 0}
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground">Block</p>
                    <p className="mt-1 text-lg font-semibold">
                      {selectedRoom.block || "A"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground">Capacity</p>
                    <p className="mt-1 text-lg font-semibold">
                      {selectedRoom.capacity}
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted p-4">
                    <p className="text-xs text-muted-foreground">Occupied</p>
                    <p className="mt-1 text-lg font-semibold">
                      {selectedRoom.occupied || 0}
                    </p>
                  </div>
                </div>

                <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-semibold">Assigned students</h4>
                      <p className="text-xs text-muted-foreground">{roomAllocations.length} of {selectedRoom.capacity} beds occupied</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={refreshAssignments} disabled={allocationLoading || allocationSaving}>
                      <RefreshCw className="mr-2 h-3.5 w-3.5" /> Refresh
                    </Button>
                  </div>
                  {allocationLoading ? <p className="text-sm text-muted-foreground">Loading assignments...</p> :
                    roomAllocations.length ? (
                      <div className="max-h-48 space-y-2 overflow-y-auto">
                        {roomAllocations.map((allocation) => {
                          const assigned = allocation.students || {};
                          return <div key={allocation.id} className="flex items-center justify-between gap-3 rounded-md bg-muted/60 p-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">{assigned.full_name || "Student"}</p>
                              <p className="truncate text-xs text-muted-foreground">{assigned.usn || assigned.email || "—"}</p>
                            </div>
                            <Button size="sm" variant="ghost" className="shrink-0 text-destructive" disabled={allocationSaving} onClick={() => handleDeallocateStudent(allocation.id)}>
                              <UserRoundX className="mr-1 h-4 w-4" /> Remove
                            </Button>
                          </div>;
                        })}
                      </div>
                    ) : <p className="text-sm text-muted-foreground">No students assigned to this room yet.</p>}
                  <div className="space-y-2 border-t pt-3">
                    <h4 className="text-sm font-semibold">Assign a student</h4>
                    <Input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search eligible students by name, USN or email" />
                    <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                      <SelectTrigger><SelectValue placeholder={filteredEligibleStudents.length ? "Choose an unassigned student" : "No eligible students"} /></SelectTrigger>
                      <SelectContent>
                        {filteredEligibleStudents.map((student) => <SelectItem key={student.id} value={student.id}>
                          {(student.fullName || student.full_name || "Unnamed")} · {student.usn || student.email || "No USN"}
                        </SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Button className="w-full" onClick={handleAssignStudent} disabled={!selectedStudentId || allocationSaving || allocationLoading || roomAllocations.length >= Number(selectedRoom.capacity)}>
                      <UserPlus className="mr-2 h-4 w-4" />{allocationSaving ? "Saving..." : "Assign student"}
                    </Button>
                    {roomAllocations.length >= Number(selectedRoom.capacity) && <p className="text-xs text-amber-600">This room is full.</p>}
                    {allocationError && <p className="text-sm text-destructive">{allocationError}</p>}
                  </div>
                </div>

                <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Occupancy
                    </span>
                    <span className="font-medium">
                      {selectedRoom.capacity
                        ? Math.round(
                            (Number(selectedRoom.occupied || 0) /
                              Number(selectedRoom.capacity)) *
                              100
                          )
                        : 0}
                      %
                    </span>
                  </div>

                  <Progress
                    value={
                      selectedRoom.capacity
                        ? (Number(selectedRoom.occupied || 0) /
                            Number(selectedRoom.capacity)) *
                          100
                        : 0
                    }
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
