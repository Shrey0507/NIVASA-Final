import { Router } from "express";
const router = Router();

/** GET /api/students */
router.get("/", async (req, res, next) => {
  try {
    const { hostel, department, year, search, limit = 50 } = req.query;
    let query = req.supabaseAdmin
      .from("students")
      .select("*, rooms(room_number)")
      .order("created_at", { ascending: false })
      .limit(Number(limit));

    if (hostel) query = query.eq("hostel", hostel);
    if (department) query = query.eq("department", department);
    if (year) query = query.eq("year", year);
    if (search) query = query.ilike("full_name", `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** GET /api/students/:id */
router.get("/:id", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("students")
      .select("*, rooms(room_number)")
      .eq("id", req.params.id)
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** POST /api/students */
router.post("/", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("students")
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json({ data });
  } catch (err) {
    next(err);
  }
});

/** PATCH /api/students/:id */
router.patch("/:id", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("students")
      .update(req.body)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/students/:id */
router.delete("/:id", async (req, res, next) => {
  try {
    const { error } = await req.supabaseAdmin
      .from("students")
      .delete()
      .eq("id", req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
