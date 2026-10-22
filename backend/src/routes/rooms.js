import { Router } from "express";
const router = Router();

/** GET /api/rooms */
router.get("/", async (req, res, next) => {
  try {
    const { hostel, floor, status, limit = 100 } = req.query;
    let query = req.supabaseAdmin
      .from("rooms")
      .select("*")
      .order("room_number", { ascending: true })
      .limit(Number(limit));

    if (hostel) query = query.eq("hostel", hostel);
    if (floor) query = query.eq("floor", floor);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

export default router;
