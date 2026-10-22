/**
 * NIVASA auth endpoint tests.
 *
 * Tests:
 *  1. POST /api/auth/login is publicly accessible (no token needed)
 *  2. GET  /api/auth/me rejects requests without a token (401)
 *  3. GET  /api/dashboard rejects requests without a token (401)
 *  4. POST /api/auth/login returns 400 for missing body
 *  5. GET  /api/health is publicly accessible
 *
 * Usage:
 *   node backend/tests/test-auth.js [BASE_URL]
 *
 * Default BASE_URL: https://nivasa-final.onrender.com
 */

const BASE = (process.argv[2] || "https://nivasa-final.onrender.com").replace(/\/$/, "");

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
  } catch (err) {
    console.log(`  ❌ ${name}`);
    console.log(`     ${err.message}`);
    process.exitCode = 1;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  console.log(`\nTesting against: ${BASE}\n`);

  // ── 1. Health endpoint is public ──
  await test("GET /api/health is public", async () => {
    const res = await fetch(`${BASE}/api/health`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await res.json();
    assert(body.status === "ok", `Expected { status: "ok" }, got ${JSON.stringify(body)}`);
  });

  // ── 2. Login endpoint is publicly accessible (no token) ──
  await test("POST /api/auth/login is reachable without a token (returns 400 for empty body, not 401)", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const body = await res.json();
    // Should be 400 (missing fields), NOT 401 (MISSING_CREDENTIALS)
    assert(
      res.status === 400,
      `Expected 400 (bad request), got ${res.status}: ${JSON.stringify(body)}`
    );
    assert(
      !body.error?.code?.includes("MISSING_CREDENTIALS"),
      `Got MISSING_CREDENTIALS — login is still behind authMiddleware`
    );
  });

  // ── 3. Login with invalid credentials returns 401 (not middleware 401) ──
  await test("POST /api/auth/login with wrong password returns auth 401", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "nonexistent@test.com", password: "wrong" }),
    });
    const body = await res.json();
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(
      body.error?.message?.toLowerCase().includes("invalid"),
      `Expected "invalid credentials" message, got: ${body.error?.message}`
    );
  });

  // ── 4. GET /api/auth/me rejects missing token with 401 ──
  await test("GET /api/auth/me rejects unauthenticated requests (401)", async () => {
    const res = await fetch(`${BASE}/api/auth/me`);
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // ── 5. GET /api/dashboard rejects missing token with 401 ──
  await test("GET /api/dashboard rejects unauthenticated requests (401)", async () => {
    const res = await fetch(`${BASE}/api/dashboard`);
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  // ── 6. POST /api/accounts rejects missing token with 401 ──
  await test("POST /api/accounts/admins rejects unauthenticated requests (401)", async () => {
    const res = await fetch(`${BASE}/api/accounts/admins`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@test.com", full_name: "Test" }),
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
  });

  console.log("\nDone.\n");
}

main();
