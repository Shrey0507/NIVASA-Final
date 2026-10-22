import "dotenv/config";
import express from "express";
import cors from "cors";

import { authMiddleware } from "./middleware/auth.js";
import {
  attachRole,
  requireAdmin,
  requireSuperAdmin,
  enforceHostelScope,
  requireRole,
} from "./middleware/authorize.js";
import authRouter from "./routes/auth.js";
import dashboardRouter from "./routes/dashboard.js";
import studentsRouter from "./routes/students.js";
import roomsRouter from "./routes/rooms.js";
import allocationsRouter from "./routes/allocations.js";
import feesRouter from "./routes/fees.js";
import movementsRouter from "./routes/movements.js";
import grievancesRouter from "./routes/grievances.js";
import noticesRouter from "./routes/notices.js";
import messRouter from "./routes/mess.js";
import accountsRouter from "./routes/accounts.js";

const app = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Health check (no auth)
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// All /api/* routes require a valid user JWT
app.use("/api", authMiddleware);

// Attach the trusted role from JWT claims to every request
app.use("/api", attachRole);

// ── Auth routes (role-aware but no role restriction) ───────
app.use("/api/auth", authRouter);

// ── Admin routes — require admin role + enforce hostel scope ──
app.use("/api/dashboard", requireAdmin, enforceHostelScope, dashboardRouter);
app.use("/api/students", requireAdmin, enforceHostelScope, studentsRouter);
app.use("/api/rooms", requireAdmin, enforceHostelScope, roomsRouter);
app.use("/api/allocations", requireAdmin, enforceHostelScope, allocationsRouter);
app.use("/api/fees", requireRole("super_admin", "boys_admin", "girls_admin", "student"), enforceHostelScope, feesRouter);
app.use("/api/movements", requireRole("super_admin", "boys_admin", "girls_admin", "student"), enforceHostelScope, movementsRouter);
app.use("/api/grievances", requireRole("super_admin", "boys_admin", "girls_admin", "student"), enforceHostelScope, grievancesRouter);
app.use("/api/notices", requireRole("super_admin", "boys_admin", "girls_admin", "student"), noticesRouter);
app.use("/api/mess", requireRole("super_admin", "boys_admin", "girls_admin", "student"), messRouter);
app.use("/api/accounts", requireAdmin, accountsRouter);

// ── Error handler ──────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err);
  const status = err.status || 500;
  res.status(status).json({
    error: { message: err.message || "Internal server error" },
  });
});

app.listen(PORT, () => {
  console.log(`🏠 NIVASA backend listening on http://localhost:${PORT}`);
});
