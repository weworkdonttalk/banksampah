import { NextResponse } from "next/server";
import {
  generateTelemetry,
  getStandbyTelemetry,
  calculateRiskScore,
  getRiskLevel,
  StationTelemetry,
} from "@/lib/mock-telemetry";

// In-memory telemetry cache for real-time state
// ponytail: connect to Prisma PostgreSQL pool once DB connection string is provisioned
const latestStore: Record<string, StationTelemetry> = {
  "BALI-ECO-01": getStandbyTelemetry("BALI-ECO-01"),
  "BALI-ECO-02": getStandbyTelemetry("BALI-ECO-02"),
  "BALI-ECO-03": getStandbyTelemetry("BALI-ECO-03"),
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const stationId = searchParams.get("station_id");

  if (stationId) {
    const station = latestStore[stationId] ?? generateTelemetry(stationId);
    const riskScore = calculateRiskScore(station);
    return NextResponse.json({
      success: true,
      data: station,
      risk_score: riskScore,
      risk_level: getRiskLevel(riskScore),
    });
  }

  const allStations = Object.values(latestStore);
  return NextResponse.json({
    success: true,
    total: allStations.length,
    stations: allStations.map((st) => ({
      ...st,
      risk_score: calculateRiskScore(st),
      risk_level: getRiskLevel(calculateRiskScore(st)),
    })),
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      station_id,
      temperature,
      gas_ppm,
      distance_cm,
      fill_percent,
      servo_position,
      timestamp,
    } = body;

    // Strict Input Validation
    if (!station_id || typeof station_id !== "string") {
      return NextResponse.json(
        { success: false, error: "station_id wajib berupa string valid." },
        { status: 400 }
      );
    }

    if (typeof temperature !== "number" || temperature < -10 || temperature > 120) {
      return NextResponse.json(
        { success: false, error: "temperature wajib berada pada rentang -10°C s.d 120°C." },
        { status: 400 }
      );
    }

    if (typeof gas_ppm !== "number" || gas_ppm < 0 || gas_ppm > 5000) {
      return NextResponse.json(
        { success: false, error: "gas_ppm wajib berupa angka positif." },
        { status: 400 }
      );
    }

    if (typeof fill_percent !== "number" || fill_percent < 0 || fill_percent > 100) {
      return NextResponse.json(
        { success: false, error: "fill_percent wajib berada pada rentang 0-100%." },
        { status: 400 }
      );
    }

    const telemetryEntry: StationTelemetry = {
      station_id,
      temperature,
      gas_ppm,
      distance_cm: typeof distance_cm === "number" ? distance_cm : 20,
      fill_percent,
      servo_position: servo_position || "CLOSED",
      timestamp: timestamp || new Date().toISOString(),
      is_online: true,
    };

    latestStore[station_id] = telemetryEntry;

    const riskScore = calculateRiskScore(telemetryEntry);
    const riskLevel = getRiskLevel(riskScore);
    const isChokeRecommended = temperature > 45 || gas_ppm > 400;

    return NextResponse.json(
      {
        success: true,
        message: "Data telemetri IoT berhasil dicatat.",
        data: telemetryEntry,
        analysis: {
          risk_score: riskScore,
          risk_level: riskLevel,
          hazard_detected: riskLevel === "HAZARD",
          choke_mode_recommended: isChokeRecommended,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json(
      { success: false, error: "Payload JSON tidak valid", detail: message },
      { status: 400 }
    );
  }
}
