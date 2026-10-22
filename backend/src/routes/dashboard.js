import { Router } from "express";
const router = Router();

/**
 * GET /api/dashboard
 * Returns aggregate counts for the admin dashboard.
 */
router.get("/", async (req, res, next) => {
  try {
    const admin = req.supabaseAdmin;

    const [students, rooms, fees, movements, grievances, notices] =
      await Promise.all([
        admin.from("students").select("id", { count: "exact", head: true }),
        admin.from("rooms").select("id", { count: "exact", head: true }),
        admin.from("fees").select("id", { count: "exact", head: true }),
        admin.from("movements").select("id", { count: "exact", head: true }),
        admin.from("grievances").select("id", { count: "exact", head: true }),
        admin.from("notices").select("id", { count: "exact", head: true }),
      ]);

    res.json({
      counts: {
        students: students.count ?? 0,
        rooms: rooms.count ?? 0,
        fees: fees.count ?? 0,
        movements: movements.count ?? 0,
        grievances: grievances.count ?? 0,
        notices: notices.count ?? 0,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
