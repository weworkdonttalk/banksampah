import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbService } from "@/lib/db-service";

const EventSchema = z.object({
  device_id: z.string().min(1),
  type: z.enum(["waste_in"]).default("waste_in"),
  distance_cm: z.number().optional(),
  ts: z.number().optional(),
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
    const parsed = EventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Format payload event tidak valid", details: parsed.error.format() },
        { status: 400 }
      );
    }

    const { type, distance_cm } = parsed.data;

    // Catat event dengan debounce 5 detik & hubungkan ke sesi aktif stasiun
    const recordResult = await dbService.recordStationEvent({
      stationId: station.id,
      type,
      distanceCm: distance_cm,
      rawPayload: JSON.stringify(body),
    });

    if (recordResult.debounced) {
      return NextResponse.json({
        success: true,
        debounced: true,
        message: "Event diabaikan (debounce 5 detik pada stasiun yang sama)",
      });
    }

    return NextResponse.json({
      success: true,
      debounced: false,
      eventId: recordResult.event.id,
      hasActiveSession: recordResult.sessionUpdated,
      sessionId: recordResult.sessionId || null,
      message: recordResult.sessionUpdated
        ? "Sampah masuk terdeteksi & dikaitkan ke sesi aktif warga."
        : "Sampah masuk tanpa sesi aktif (tidak menambah saldo).",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
