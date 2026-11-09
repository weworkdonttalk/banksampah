import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";
import { calculateFireRisk, getAiRiskExplanation } from "@/lib/risk";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;

    // Parse sensor inputs from query params if available
    const searchParams = req.nextUrl.searchParams;
    const tempParam = searchParams.get("temp");
    const gasParam = searchParams.get("gas");
    const prevTempParam = searchParams.get("prevTemp");
    const prevGasParam = searchParams.get("prevGas");

    let temperature = tempParam ? Number(tempParam) : 31.5;
    let gasPpm = gasParam ? Number(gasParam) : 120;
    let prevTemperature = prevTempParam ? Number(prevTempParam) : temperature;
    let prevGasPpm = prevGasParam ? Number(prevGasParam) : gasPpm;

    // Jika parameter tidak ada di query, ambil telemetri terbaru dari database stasiun
    if (!tempParam || !gasParam) {
      const readings = await dbService.getStationReadings(id, 1);
      if (readings && readings.length > 0) {
        temperature = readings[0].temp;
        gasPpm = readings[0].smoke;
        if (readings.length > 1) {
          prevTemperature = readings[1].temp;
          prevGasPpm = readings[1].smoke;
        }
      }
    }

    const station = await dbService.getStationById(id);
    const stationName = station?.name || `Stasiun ${id}`;
    const banjarName = station?.banjar?.nama || "Kecamatan Denpasar";

    // 1. Perhitungan deterministik server-side
    const riskResult = calculateFireRisk({
      temperature,
      gasPpm,
      prevTemperature,
      prevGasPpm,
      deltaTimeSeconds: 60,
    });

    // 2. Penjelasan & Rekomendasi AI via Gemini (in-memory cached 60 detik)
    const aiExplanation = await getAiRiskExplanation(
      riskResult,
      {
        stationId: id,
        stationName,
        banjarName,
      },
      session?.userId
    );

    return NextResponse.json({
      success: true,
      stationId: id,
      stationName,
      risk: riskResult,
      explanation: aiExplanation,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal menganalisis risiko";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
