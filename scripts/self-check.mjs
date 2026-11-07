import assert from "node:assert";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";

async function runChecks() {
  console.log("[CHECK] Testing EcoSort AI APIs against " + BASE_URL);

  // 1. GET /api/telemetry
  const tGetRes = await fetch(`${BASE_URL}/api/telemetry`);
  assert.strictEqual(tGetRes.status, 200, "GET /api/telemetry status must be 200");
  const tGetData = await tGetRes.json();
  assert.strictEqual(tGetData.success, true, "GET /api/telemetry success true");
  assert.ok(Array.isArray(tGetData.stations), "Stations list present");

  // 2. POST /api/telemetry (Simulated ESP32)
  const tPostRes = await fetch(`${BASE_URL}/api/telemetry`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      station_id: "BALI-ECO-01",
      temperature: 48.5,
      gas_ppm: 460,
      distance_cm: 6.2,
      fill_percent: 88,
      servo_position: "CHOKE_MODE",
    }),
  });
  assert.strictEqual(tPostRes.status, 201, "POST /api/telemetry status must be 201");
  const tPostData = await tPostRes.json();
  assert.strictEqual(tPostData.success, true, "POST /api/telemetry success true");
  assert.strictEqual(tPostData.analysis.hazard_detected, true, "Hazard detected on high gas/temp");

  // 3. POST /api/choke-mode
  const chokeRes = await fetch(`${BASE_URL}/api/choke-mode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      station_id: "BALI-ECO-01",
      action: "ACTIVATE",
      triggered_by: "TEST_RUNNER",
      reason: "Automated assertion check",
    }),
  });
  assert.strictEqual(chokeRes.status, 200, "POST /api/choke-mode status must be 200");
  const chokeData = await chokeRes.json();
  assert.strictEqual(chokeData.data.status, "CHOKE_ENGAGED", "Choke mode engaged");

  // 4. POST /api/deposits
  const depRes = await fetch(`${BASE_URL}/api/deposits`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "user-test",
      userName: "Rangga Test",
      wasteType: "ORGANIC",
      weightGram: 2000,
    }),
  });
  assert.strictEqual(depRes.status, 201, "POST /api/deposits status must be 201");
  const depData = await depRes.json();
  assert.strictEqual(depData.data.pointsEarned, 1000, "Points calculated correctly (2000g * 0.5)");

  // 5. GET /login
  const loginRes = await fetch(`${BASE_URL}/login`);
  assert.strictEqual(loginRes.status, 200, "GET /login page status must be 200");

  console.log("[PASS] All self-checks passed without error.");
}

runChecks().catch((err) => {
  console.error("[FAIL]", err);
  process.exit(1);
});
