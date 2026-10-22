import "dotenv/config";
import express from "express";
import cors from "cors";

import { authMiddleware } from "./middleware/auth.js";
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

// ── Routes ─────────────────────────────────────────────────
app.use("/api/dashboard", dashboardRouter);
app.use("/api/students", studentsRouter);
app.use("/api/rooms", roomsRouter);
app.use("/api/allocations", allocationsRouter);
app.use("/api/fees", feesRouter);
app.use("/api/movements", movementsRouter);
app.use("/api/grievances", grievancesRouter);
app.use("/api/notices", noticesRouter);
app.use("/api/mess", messRouter);
app.use("/api/accounts", accountsRouter);

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
