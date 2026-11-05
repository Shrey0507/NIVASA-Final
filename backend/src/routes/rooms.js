import { Router } from "express";
const router = Router();

/** GET /api/rooms */
router.get("/", async (req, res, next) => {
  try {
    const { hostel, floor, block, status, availability, search, limit = 100 } =
      req.query;
    let query = req.supabaseAdmin
      .from("rooms")
      .select("*")
      .order("room_number", { ascending: true })
      .limit(Number(limit));

    if (hostel) query = query.eq("hostel", hostel);
    if (floor) query = query.eq("floor", floor);
    if (block) query = query.eq("block", block);
    if (status) query = query.eq("status", status);
    if (search) query = query.ilike("room_number", `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;

    // occupied/capacity are columns on the same row, so filter here
    let rooms = data || [];
    if (availability === "available") {
      rooms = rooms.filter((r) => r.occupied < r.capacity);
    } else if (availability === "full") {
      rooms = rooms.filter((r) => r.occupied >= r.capacity);
    }

    res.json({ data: rooms });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/rooms
 *
 * Admin only (enforced in index.js). Hostel-scoped admins can only create
 * rooms in their own hostel, whatever they send.
 */
router.post("/", async (req, res, next) => {
  try {
    const { room_number, floor, block, capacity } = req.body;
    const hostel = req.hostelScope || req.body.hostel;

    const number = String(room_number ?? "").trim();
    if (!number) {
      return res
        .status(400)
        .json({ error: { message: "Room number is required." } });
    }
    if (!["boys", "girls"].includes(hostel)) {
      return res
        .status(400)
        .json({ error: { message: "Hostel must be 'boys' or 'girls'." } });
    }
    const cap = Number(capacity);
    if (!Number.isInteger(cap) || cap < 1 || cap > 10) {
      return res
        .status(400)
        .json({ error: { message: "Capacity must be between 1 and 10." } });
    }
    const fl = Number(floor);
    if (!Number.isInteger(fl) || fl < 0) {
      return res
        .status(400)
        .json({ error: { message: "Floor must be a valid number." } });
    }

    const { data, error } = await req.supabaseAdmin
      .from("rooms")
      .insert({
        room_number: number,
        hostel,
        floor: fl,
        block: String(block || "A").trim().toUpperCase(),
        capacity: cap,
        occupied: 0,
        status: "available",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: { message: `Room ${number} already exists in the ${hostel} hostel.` },
        });
      }
      throw error;
    }
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
