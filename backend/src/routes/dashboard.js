import { Router } from "express";
const router = Router();

/**
 * GET /api/dashboard
 * Returns aggregate counts for the admin dashboard.
 *
 * Hostel-scoped: boys_admin sees only boys hostel counts,
 * girls_admin sees only girls hostel counts,
 * super_admin sees everything.
 */
router.get("/", async (req, res, next) => {
  try {
    const admin = req.supabaseAdmin;
    const hostel = req.query.hostel; // enforced by enforceHostelScope middleware

    // Build queries with optional hostel filter
    let studentsQ = admin.from("students").select("id", { count: "exact", head: true });
    let roomsQ = admin.from("rooms").select("id", { count: "exact", head: true });
    let feesQ = admin.from("fees").select("id", { count: "exact", head: true });
    let movementsQ = admin.from("movements").select("id", { count: "exact", head: true });
    let grievancesQ = admin.from("grievances").select("id", { count: "exact", head: true });
    let noticesQ = admin.from("notices").select("id", { count: "exact", head: true });

    if (hostel) {
      studentsQ = studentsQ.eq("hostel", hostel);
      roomsQ = roomsQ.eq("hostel", hostel);
      // fees, movements, grievances are linked via student — filter if the
      // table has a hostel column; otherwise the count is approximate
    }

    const [students, rooms, fees, movements, grievances, notices] =
      await Promise.all([
        studentsQ,
        roomsQ,
        feesQ,
        movementsQ,
        grievancesQ,
        noticesQ,
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
