import { NextRequest, NextResponse } from "next/server";
import { dbService } from "@/lib/db-service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      deviceId = "ST-001",
      action = "sensor_telemetry", // "waste_in" | "sensor_telemetry" | "bin_full"
      mode = "normal",
      customTemp,
      customSmoke,
      distanceCm = 12.5,
    } = body;

    const station = await dbService.getStationByDeviceId(deviceId);
    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    // Aksi 1: Simulasi Ultrasonic Sampah Masuk (waste_in)
    if (action === "waste_in") {
      const eventResult = await dbService.recordStationEvent({
        stationId: station.id,
        type: "waste_in",
        distanceCm,
        rawPayload: JSON.stringify({ device_id: deviceId, action, distance_cm: distanceCm }),
      });

      return NextResponse.json({
        success: true,
        action: "waste_in",
        deviceId,
        debounced: eventResult.debounced,
        hasActiveSession: eventResult.sessionUpdated,
        sessionId: eventResult.sessionId || null,
        message: eventResult.sessionUpdated
          ? "Sampah masuk berhasil disimulasikan & sesi aktif diperbarui ke TRASH_DETECTED!"
          : "Sampah masuk dicatat, namun belum ada sesi aktif pada stasiun ini.",
      });
    }

    // Aksi 2: Simulasi Tong Penuh
    if (action === "bin_full") {
      const fillResult = await dbService.updateStationFillLevel(station.id, 88.5);
      return NextResponse.json({
        success: true,
        action: "bin_full",
        deviceId,
        fillLevel: 88.5,
        alertCreated: fillResult?.alertCreated,
        message: "Kapasitas tong diset ke 88.5% (Peringatan Tong Penuh terpicu)",
      });
    }

    // Aksi 3: Telemetri Suhu & Gas
    let temp = 31.5;
    let smoke = 120;
    let fillLevel = 45.0;

    if (mode === "danger") {
      temp = 63.8;
      smoke = 720;
    } else if (mode === "warning") {
      temp = 48.2;
      smoke = 380;
    } else if (mode === "custom") {
      temp = Number(customTemp ?? 31.5);
      smoke = Number(customSmoke ?? 120);
    } else {
      temp = Number((30 + Math.random() * 4).toFixed(1));
      smoke = Math.floor(100 + Math.random() * 60);
      fillLevel = Math.min(95, Math.floor(40 + Math.random() * 15));
    }

    const reading = await dbService.saveReading({
      stationId: station.id,
      temp,
      smoke,
      humidity: 70,
      fillLevel,
    });

    let alertCreated = null;
    if (temp >= station.tempDangerThreshold || smoke >= station.smokeDangerThreshold) {
      alertCreated = await dbService.createAlert({
        stationId: station.id,
        type: "COMBINED",
        level: "BAHAYA",
        value: Math.max(temp, smoke),
      });
    }

    return NextResponse.json({
      success: true,
      deviceId,
      temp,
      smoke,
      fillLevel,
      readingId: reading.id,
      alert: alertCreated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
