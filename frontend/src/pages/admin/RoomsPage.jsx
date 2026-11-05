import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BedDouble,
  Plus,
  Search,
  Users,
  Building2,
  CheckCircle2,
} from "lucide-react";

import { getRooms, createRoom } from "@/services/adminService";
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
    } catch (err) {
      setError(err.message || "Unable to load rooms.");
    } finally {
      setLoading(false);
    }
  }, [hostel, floor, block, availability, search]);

  useEffect(() => {
    load();
  }, [load]);

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
    <div className="space-y-6">
      <PageHeader
        title="Room Management"
        description="Manage hostel rooms, occupancy and bed availability."
      />

      {/* Hostel tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          value={hostel}
          onValueChange={(value) => {
            setHostel(value);
            setFloor(ALL);
            setBlock(ALL);
            setAvailability(ALL);
          }}
        >
          <TabsList>
            <TabsTrigger value="boys">Boys Hostel</TabsTrigger>
            <TabsTrigger value="girls">Girls Hostel</TabsTrigger>
          </TabsList>
        </Tabs>

        <Button onClick={openAddDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Room
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Rooms</p>
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{summary.total}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rooms in selected hostel
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Total Beds</p>
            <BedDouble className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{summary.beds}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Total bed capacity
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Occupied Beds</p>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="mt-2 text-2xl font-bold">{summary.occupied}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.pct}% occupancy
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Available Rooms</p>
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <p className="mt-2 text-2xl font-bold">{summary.available}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Rooms with vacant beds
          </p>
        </div>
      </div>

      {/* Occupancy */}
      <div className="rounded-xl border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Overall Occupancy</h3>
            <p className="text-sm text-muted-foreground">
              {summary.occupied} of {summary.beds} beds occupied
            </p>
          </div>
          <span className="text-lg font-semibold">{summary.pct}%</span>
        </div>
        <Progress value={summary.pct} />
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:flex-row md:flex-wrap">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search room number..."
            className="pl-9"
          />
        </div>

        <Select value={floor} onValueChange={setFloor}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="All floors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All floors</SelectItem>
            {floors.map((value) => (
              <SelectItem key={value} value={value}>
                Floor {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={block} onValueChange={setBlock}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="All blocks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All blocks</SelectItem>
            {blocks.map((value) => (
              <SelectItem key={value} value={value}>
                Block {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={availability} onValueChange={setAvailability}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="All availability" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All availability</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="occupied">Occupied</SelectItem>
            <SelectItem value="full">Full</SelectItem>
          </SelectContent>
        </Select>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="space-y-3 rounded-xl border p-5">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
        </div>
      ) : !error && rooms.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center">
          <BedDouble className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-3 font-semibold">No rooms found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add a room or change your filters to see rooms here.
          </p>
          <Button className="mt-4" onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        </div>
      ) : !error ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      ROOM NUMBER
                    </p>
                    <h3 className="mt-1 text-xl font-bold">
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

                <div className="mt-5">
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
                  variant="outline"
                  className="mt-5 w-full"
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
        <DialogContent className="sm:max-w-[450px]">
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

                <div className="rounded-lg border p-4">
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
