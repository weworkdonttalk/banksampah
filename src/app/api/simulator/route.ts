import { NextRequest, NextResponse } from "next/server";
import { dbService } from "@/lib/db-service";

export async function POST(req: NextRequest) {
  try {
    const { deviceId = "ST-001", mode = "random", customTemp, customSmoke } = await req.json();

    const station = await dbService.getStationByDeviceId(deviceId);
    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    let temp = 31.5;
    let smoke = 120;

    if (mode === "danger") {
      temp = 63.8;
      smoke = 720;
    } else if (mode === "warning") {
      temp = 48.2;
      smoke = 380;
    } else if (mode === "normal") {
      temp = 30.5;
      smoke = 110;
    } else if (mode === "custom") {
      temp = Number(customTemp ?? 31.5);
      smoke = Number(customSmoke ?? 120);
    } else {
      // Small random walk around 32C
      temp = Number((30 + Math.random() * 4).toFixed(1));
      smoke = Math.floor(100 + Math.random() * 60);
    }

    // Call internal ingest logic
    const reading = await dbService.saveReading({
      stationId: station.id,
      temp,
      smoke,
      humidity: 70,
    });

    let alertCreated = null;
    if (temp >= station.tempDangerThreshold || smoke >= station.smokeDangerThreshold) {
      alertCreated = await dbService.createAlert({
        stationId: station.id,
        type: "COMBINED",
        level: "BAHAYA",
        value: Math.max(temp, smoke),
      });
    } else if (temp >= station.tempWarnThreshold || smoke >= station.smokeWarnThreshold) {
      alertCreated = await dbService.createAlert({
        stationId: station.id,
        type: "TEMPERATURE",
        level: "WASPADA",
        value: temp,
      });
    }

    return NextResponse.json({
      success: true,
      deviceId,
      temp,
      smoke,
      readingId: reading.id,
      alert: alertCreated,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
