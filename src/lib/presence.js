/**
 * Hostel presence calculation.
 *
 * RULE (the single source of truth for "who is inside right now"):
 * a resident's current presence is decided ONLY by that resident's most recent
 * valid entry/exit event.
 *
 *   - latest valid event is an ENTRY  -> inside
 *   - latest valid event is an EXIT   -> outside
 *   - no valid event, or a tie we cannot resolve -> unknown
 *
 * Guarantees:
 *   - a resident is counted in exactly one bucket (never double counted)
 *   - "unknown" is never folded into "inside" or "outside"
 *   - multiple entries/exits are handled by time ordering
 *   - duplicate timestamps are resolved deterministically (EXIT wins, since a
 *     conflicting pair is safer treated as "not confirmed inside")
 *   - timestamps must parse to a finite value; invalid rows are ignored
 *
 * This function is pure and dependency-free so it can be unit tested with any
 * event sequence. Data fetching lives elsewhere.
 */

export const PRESENCE_RULE =
  "Latest valid event wins: ENTRY = inside, EXIT = outside, no valid event = unknown.";

const EVENT_TYPES = new Set(["entry", "exit"]);

/**
 * @param {unknown} event
 * @returns {boolean}
 */
export function isValidEvent(event) {
  if (!event || typeof event !== "object") return false;
  const { type, timestamp } = /** @type {{ type?: unknown, timestamp?: unknown }} */ (event);
  if (!EVENT_TYPES.has(/** @type {string} */ (type))) return false;
  return Number.isFinite(Date.parse(/** @type {string} */ (timestamp)));
}

/**
 * @typedef {Object} PresenceStudent
 * @property {number | string} id
 * @property {string | null} [fullName]
 * @property {string | null} [usn]
 * @property {string | null} [hostel]
 *
 * @typedef {Object} PresenceEvent
 * @property {number | string} studentId
 * @property {"entry" | "exit"} type
 * @property {string} timestamp
 *
 * @typedef {Object} PresenceResult
 * @property {number} inside
 * @property {number} outside
 * @property {number} unknown
 * @property {number} assigned
 * @property {string | null} lastUpdatedAt
 * @property {Record<string, { inside: number, outside: number, unknown: number, assigned: number }>} byHostel
 * @property {Array<{ id: number | string, name: string, usn: string | null, hostel: string, status: "inside" | "outside" | "unknown", lastEventAt: string | null }>} students
 */

/**
 * @param {PresenceStudent[]} students
 * @param {PresenceEvent[]} events
 * @returns {PresenceResult}
 */
export function calculatePresence(students, events) {
  /** @type {Map<number | string, { time: number, type: string }>} */
  const latestByStudent = new Map();
  let lastUpdatedAt = 0;

  for (const event of events) {
    if (!isValidEvent(event)) continue;
    const time = Date.parse(event.timestamp);
    if (time > lastUpdatedAt) lastUpdatedAt = time;

    const current = latestByStudent.get(event.studentId);
    // Strictly newer wins; on an exact tie prefer EXIT (see rule above).
    if (
      !current ||
      time > current.time ||
      (time === current.time && event.type === "exit")
    ) {
      latestByStudent.set(event.studentId, { time, type: event.type });
    }
  }

  /** @type {PresenceResult} */
  const result = {
    inside: 0,
    outside: 0,
    unknown: 0,
    assigned: students.length,
    lastUpdatedAt: lastUpdatedAt ? new Date(lastUpdatedAt).toISOString() : null,
    byHostel: {},
    students: [],
  };

  const ensureHostel = (key) => {
    if (!result.byHostel[key]) {
      result.byHostel[key] = { inside: 0, outside: 0, unknown: 0, assigned: 0 };
    }
    return result.byHostel[key];
  };

  for (const student of students) {
    const latest = latestByStudent.get(student.id);
    /** @type {"inside" | "outside" | "unknown"} */
    let status = "unknown";
    if (latest?.type === "entry") status = "inside";
    else if (latest?.type === "exit") status = "outside";

    result[status] += 1;

    const hostelKey = student.hostel ?? "unknown";
    const bucket = ensureHostel(hostelKey);
    bucket.assigned += 1;
    bucket[status] += 1;

    result.students.push({
      id: student.id,
      name: student.fullName ?? `Resident #${String(student.id).padStart(3, "0")}`,
      usn: student.usn ?? null,
      hostel: hostelKey,
      status,
      lastEventAt: latest ? new Date(latest.time).toISOString() : null,
    });
  }

  return result;
}

/** Meal windows used for operational mess planning. */
export const MEAL_WINDOWS = {
  breakfast: { label: "Breakfast", window: "7:00 AM – 9:00 AM", startHour: 7, endHour: 9 },
  lunch: { label: "Lunch", window: "12:00 PM – 2:00 PM", startHour: 12, endHour: 14 },
  snacks: { label: "Snacks", window: "4:00 PM – 5:00 PM", startHour: 16, endHour: 17 },
  dinner: { label: "Dinner", window: "7:00 PM – 9:00 PM", startHour: 19, endHour: 21 },
};

/**
 * The next meal the mess will serve, based on the current local time.
 * @param {Date} [now]
 */
export function getUpcomingMeal(now = new Date()) {
  const hour = now.getHours();
  if (hour < MEAL_WINDOWS.breakfast.endHour) return MEAL_WINDOWS.breakfast;
  if (hour < MEAL_WINDOWS.lunch.endHour) return MEAL_WINDOWS.lunch;
  if (hour < MEAL_WINDOWS.snacks.endHour) return MEAL_WINDOWS.snacks;
  if (hour < MEAL_WINDOWS.dinner.endHour) return MEAL_WINDOWS.dinner;
  // After dinner, plan for tomorrow's breakfast.
  return { ...MEAL_WINDOWS.breakfast, tomorrow: true };
}

/**
 * Estimate portions from current presence plus an explicit safety buffer.
 *
 * This is an OPERATIONAL ESTIMATE, not a prediction of who will eat: being
 * inside the hostel does not guarantee attendance at the next meal. The buffer
 * is configurable and the assumption is always surfaced in the UI.
 *
 * @param {number} insideCount
 * @param {number} [bufferPercent]
 */
export function estimateMeals(insideCount, bufferPercent = 5) {
  const safeBuffer = Math.max(0, bufferPercent);
  const buffer = Math.round(insideCount * (safeBuffer / 100));
  return {
    insideCount,
    bufferPercent: safeBuffer,
    buffer,
    estimated: insideCount + buffer,
    assumption:
      "Students currently inside + safety buffer. Presence is not the same as meal attendance.",
  };
}
