import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbService } from "@/lib/db-service";
import { sendTelegramAlert } from "@/lib/telegram";

const IngestSchema = z.object({
  device_id: z.string().min(1),
  temp: z.number(),
  smoke: z.number(),
  humidity: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json({ error: "Missing x-api-key header" }, { status: 401 });
    }

    const station = await dbService.getStationByApiKey(apiKey);
    if (!station) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = IngestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload format", details: parsed.error }, { status: 400 });
    }

    const { device_id, temp, smoke, humidity } = parsed.data;

    // Simpan reading ke database
    const reading = await dbService.saveReading({
      stationId: station.id,
      temp,
      smoke,
      humidity,
    });

    // Evaluasi ambang batas
    let alertCreated = null;
    const isTempDanger = temp >= station.tempDangerThreshold;
    const isTempWarn = temp >= station.tempWarnThreshold;
    const isSmokeDanger = smoke >= station.smokeDangerThreshold;
    const isSmokeWarn = smoke >= station.smokeWarnThreshold;

    if (isTempDanger || isSmokeDanger) {
      alertCreated = await dbService.createAlert({
        stationId: station.id,
        type: isTempDanger && isSmokeDanger ? "COMBINED" : isTempDanger ? "TEMPERATURE" : "SMOKE",
        level: "BAHAYA",
        value: Math.max(temp, smoke),
      });

      // Kirim telegram alert
      const message = `🚨 *PERINGATAN BAHAYA: STASIUN ${station.name} (${device_id})*\n` +
        `• Suhu: *${temp.toFixed(1)}°C* (Batas Bahaya: ${station.tempDangerThreshold}°C)\n` +
        `• Asap/Gas: *${smoke} PPM* (Batas Bahaya: ${station.smokeDangerThreshold} PPM)\n` +
        `• Lokasi: ${station.lokasi}\n` +
        `• Waktu: ${new Date().toLocaleTimeString("id-ID")}\n\n` +
        `_Segera periksa wadah atau aktifkan protokol isolasi udara!_`;
      await sendTelegramAlert(message);
    } else if (isTempWarn || isSmokeWarn) {
      alertCreated = await dbService.createAlert({
        stationId: station.id,
        type: isTempWarn ? "TEMPERATURE" : "SMOKE",
        level: "WASPADA",
        value: Math.max(temp, smoke),
      });
    }

    return NextResponse.json({
      success: true,
      stationId: station.id,
      readingId: reading.id,
      alert: alertCreated ? { level: alertCreated.level, type: alertCreated.type } : null,
    });
  } catch (err: any) {
    console.error("Ingest error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
