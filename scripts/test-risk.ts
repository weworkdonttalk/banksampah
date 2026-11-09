import { calculateFireRisk } from "../src/lib/risk";
import assert from "node:assert";

console.log("=== Running Deterministic Fire Risk Engine Test Suite ===");

// Test 1: Kondisi Normal (Bali Ambien Dingin/Pagi)
const normal = calculateFireRisk({
  temperature: 30.5,
  gasPpm: 110,
  prevTemperature: 30.2,
  prevGasPpm: 108,
  deltaTimeSeconds: 60,
});
console.log(`[TEST 1] Normal Condition -> Score: ${normal.score}, Level: ${normal.level}`);
assert.strictEqual(normal.level, "AMAN", "Harus berstatus AMAN");
assert(normal.score < 40, "Skor normal harus < 40");
assert.strictEqual(normal.factors.correlationBonus, 0, "Tidak ada bonus korelasi");

// Test 2: Kondisi Waspada (Fermentasi / Gas Meningkat)
const waspada = calculateFireRisk({
  temperature: 44.0,
  gasPpm: 340,
  prevTemperature: 42.0, // naik 2°C dalam 1 menit
  prevGasPpm: 310,
  deltaTimeSeconds: 60,
});
console.log(`[TEST 2] Warning Condition -> Score: ${waspada.score}, Level: ${waspada.level}`);
assert.strictEqual(waspada.level, "WASPADA", "Harus berstatus WASPADA");
assert(waspada.score >= 40 && waspada.score < 70, "Skor waspada harus antara 40 dan 69");
assert(waspada.factors.tempRateOfRise >= 2.0, "RoR suhu terhitung akurat");

// Test 3: Kondisi Bahaya (Baterai Meledak / Suhu & Gas Sangat Tinggi)
const bahaya = calculateFireRisk({
  temperature: 58.5,
  gasPpm: 620,
  prevTemperature: 54.0, // naik 4.5°C dalam 1 menit
  prevGasPpm: 520, // naik 100 ppm
  deltaTimeSeconds: 60,
});
console.log(`[TEST 3] Hazard Condition -> Score: ${bahaya.score}, Level: ${bahaya.level}`);
assert.strictEqual(bahaya.level, "BAHAYA", "Harus berstatus BAHAYA");
assert(bahaya.score >= 70, "Skor bahaya harus >= 70");
assert.strictEqual(bahaya.factors.correlationBonus, 15, "Harus mengaktifkan bonus korelasi 15 poin");

// Test 4: Boundary Clamp (Maksimal 100)
const ekstrem = calculateFireRisk({
  temperature: 95.0,
  gasPpm: 2500,
  prevTemperature: 70.0,
  prevGasPpm: 1000,
  deltaTimeSeconds: 60,
});
console.log(`[TEST 4] Extreme Boundary -> Score: ${ekstrem.score}, Level: ${ekstrem.level}`);
assert.strictEqual(ekstrem.score, 100, "Skor ekstrem harus ter-clamp tepat di 100");
assert.strictEqual(ekstrem.level, "BAHAYA");

console.log("All 4 Deterministic Risk Unit Tests Passed Successfully!");
