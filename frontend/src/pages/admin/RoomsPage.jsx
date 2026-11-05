import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, Plus, Search } from "lucide-react";

import { getRooms, createRoom } from "@/services/adminService";
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
  const [error, setError] = useState(null);
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
    const beds = rooms.reduce((s, r) => s + Number(r.capacity || 0), 0);
    const occupied = rooms.reduce((s, r) => s + Number(r.occupied || 0), 0);
    const available = rooms.filter(
      (r) => Number(r.occupied || 0) < Number(r.capacity || 0)
    ).length;

    return {
      total,
      beds,
      occupied,
      available,
      pct: beds ? Math.round((occupied / beds) * 100) : 0,
    };
  }, [rooms]);

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
      setFormError("Please select a valid floor.");
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
