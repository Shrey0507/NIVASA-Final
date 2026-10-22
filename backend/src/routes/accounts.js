import { Router } from "express";
const router = Router();

/** GET /api/accounts */
router.get("/", async (req, res, next) => {
  try {
    const { data, error } = await req.supabaseAdmin
      .from("accounts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw error;
    res.json({ data });
  } catch (err) {
    next(err);
  }
});

/** POST /api/accounts/students — create a student account via Supabase Auth */
router.post("/students", async (req, res, next) => {
  try {
    const { email, password, full_name, usn } = req.body;
    const admin = req.supabaseAdmin;

    // Create auth user
    const { data: authUser, error: authErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, usn, role: "student" },
      });
    if (authErr) throw authErr;

    res.status(201).json({ account: authUser.user });
  } catch (err) {
    next(err);
  }
});

/** POST /api/accounts/admins — create an admin account */
router.post("/admins", async (req, res, next) => {
  try {
    const { email, password, full_name } = req.body;
    const admin = req.supabaseAdmin;

    const { data: authUser, error: authErr } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: "admin" },
      });
    if (authErr) throw authErr;

    res.status(201).json({ account: authUser.user });
  } catch (err) {
    next(err);
  }
});

/** POST /api/accounts/:id/resend-invite */
router.post("/:id/resend-invite", async (req, res, next) => {
  try {
    // Look up the user's email
    const { data: user, error: fetchErr } =
      await req.supabaseAdmin.auth.admin.getUserById(req.params.id);
    if (fetchErr) throw fetchErr;

    const { error } =
      await req.supabaseAdmin.auth.admin.inviteUserByEmail(user.user.email);
    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

/** POST /api/accounts/:id/deactivate */
router.post("/:id/deactivate", async (req, res, next) => {
  try {
    const { error } = await req.supabaseAdmin.auth.admin.updateUserById(
      req.params.id,
      { ban_duration: "876000h" } // ~100 years
    );
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
