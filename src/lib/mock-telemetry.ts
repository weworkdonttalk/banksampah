// Mock IoT telemetry data generator untuk EcoSort AI
// ponytail: replace with real MQTT/WebSocket when IoT hardware ready

export interface StationTelemetry {
  station_id: string;
  temperature: number;
  gas_ppm: number;
  distance_cm: number;
  fill_percent: number;
  servo_position: "OPEN_ORGANIC" | "OPEN_INORGANIC" | "CLOSED" | "CHOKE_MODE";
  timestamp: string;
  is_online: boolean;
}

export interface DepositRecord {
  id: string;
  userId: string;
  userName: string;
  wasteType: "ORGANIC" | "INORGANIC";
  weightGram: number;
  pointsEarned: number;
  co2SavedKg: number;
  createdAt: string;
}

export interface UserWallet {
  userId: string;
  name: string;
  totalPoints: number;
  totalCo2SavedKg: number;
  totalDeposits: number;
}

// --- Helpers ---

function rand(min: number, max: number, decimals = 1): number {
  return Number((Math.random() * (max - min) + min).toFixed(decimals));
}

function randomId(): string {
  return Math.random().toString(36).slice(2, 10);
}

// --- Generators ---

export function getStandbyTelemetry(
  stationId = "BALI-ECO-01"
): StationTelemetry {
  return {
    station_id: stationId,
    temperature: 0,
    gas_ppm: 0,
    distance_cm: 0,
    fill_percent: 0,
    servo_position: "CLOSED",
    timestamp: new Date().toISOString(),
    is_online: false,
  };
}

export function generateTelemetry(
  stationId = "BALI-ECO-01"
): StationTelemetry {
  const temperature = rand(28, 55);
  const gas_ppm = rand(50, 600, 0);
  const distance_cm = rand(3, 40);
  const fill_percent = Math.round(
    Math.max(0, Math.min(100, ((40 - distance_cm) / 40) * 100))
  );

  const servoOptions: StationTelemetry["servo_position"][] = [
    "OPEN_ORGANIC",
    "OPEN_INORGANIC",
    "CLOSED",
  ];

  return {
    station_id: stationId,
    temperature,
    gas_ppm,
    distance_cm,
    fill_percent,
    servo_position:
      servoOptions[Math.floor(Math.random() * servoOptions.length)],
    timestamp: new Date().toISOString(),
    is_online: Math.random() > 0.1, // 90% online
  };
}

/**
 * Hitung Risk Confidence Score (0-100%)
 * Korelasi laju perubahan suhu (ΔT) dan gas/asap (ΔPPM)
 */
export function calculateRiskScore(telemetry: StationTelemetry): number {
  const tempFactor = Math.min(
    1,
    Math.max(0, (telemetry.temperature - 35) / 20)
  ); // 35°C = 0, 55°C = 1
  const gasFactor = Math.min(1, Math.max(0, (telemetry.gas_ppm - 200) / 400)); // 200ppm = 0, 600ppm = 1
  const raw = tempFactor * 0.5 + gasFactor * 0.5;
  return Math.round(raw * 100);
}

export type RiskLevel = "NORMAL" | "WARNING" | "HAZARD";

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 60) return "HAZARD";
  if (score >= 30) return "WARNING";
  return "NORMAL";
}

export function generateMultipleStations(count = 3): StationTelemetry[] {
  return Array.from({ length: count }, (_, i) =>
    generateTelemetry(`BALI-ECO-${String(i + 1).padStart(2, "0")}`)
  );
}

// --- Mock deposit / wallet ---

const WASTE_RATES = {
  ORGANIC: { pointsPerGram: 0.5, co2PerGram: 0.0005 },
  INORGANIC: { pointsPerGram: 1.2, co2PerGram: 0.002 },
} as const;

export function generateDeposit(userId = "user-01"): DepositRecord {
  const wasteType: "ORGANIC" | "INORGANIC" =
    Math.random() > 0.5 ? "INORGANIC" : "ORGANIC";
  const weightGram = rand(50, 2000, 0);
  const rate = WASTE_RATES[wasteType];

  return {
    id: randomId(),
    userId,
    userName: "Wayan Sudiarta",
    wasteType,
    weightGram,
    pointsEarned: Math.round(weightGram * rate.pointsPerGram),
    co2SavedKg: Number((weightGram * rate.co2PerGram).toFixed(3)),
    createdAt: new Date().toISOString(),
  };
}

export function generateWallet(): UserWallet {
  return {
    userId: "user-01",
    name: "Wayan Sudiarta",
    totalPoints: rand(1200, 8500, 0),
    totalCo2SavedKg: rand(2.5, 45, 2),
    totalDeposits: rand(15, 120, 0),
  };
}

// --- Impact counters (landing page) ---

export interface ImpactStats {
  totalWasteSortedKg: number;
  totalCo2SavedKg: number;
  activeStations: number;
  totalUsers: number;
}

export function generateImpactStats(): ImpactStats {
  return {
    totalWasteSortedKg: rand(12400, 15800, 0),
    totalCo2SavedKg: rand(3200, 4100, 1),
    activeStations: Math.floor(rand(8, 14, 0)),
    totalUsers: Math.floor(rand(340, 520, 0)),
  };
}
