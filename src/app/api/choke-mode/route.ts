import { NextResponse } from "next/server";

interface ChokeOverrideRecord {
  station_id: string;
  status: "CHOKE_ENGAGED" | "STANDBY_UNLOCKED";
  triggered_by: string;
  reason: string;
  timestamp: string;
}

const overrideHistory: ChokeOverrideRecord[] = [];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { station_id, action, triggered_by, reason } = body;

    if (!station_id || typeof station_id !== "string") {
      return NextResponse.json(
        { success: false, error: "station_id wajib disertakan." },
        { status: 400 }
      );
    }

    if (action !== "ACTIVATE" && action !== "DEACTIVATE") {
      return NextResponse.json(
        { success: false, error: "action wajib bernilai ACTIVATE atau DEACTIVATE." },
        { status: 400 }
      );
    }

    const record: ChokeOverrideRecord = {
      station_id,
      status: action === "ACTIVATE" ? "CHOKE_ENGAGED" : "STANDBY_UNLOCKED",
      triggered_by: triggered_by || "OPERATOR_COMMAND",
      reason: reason || (action === "ACTIVATE" ? "Protokol pencegahan isolasi oksigen" : "Normalisasi operasional stasiun"),
      timestamp: new Date().toISOString(),
    };

    overrideHistory.unshift(record);

    return NextResponse.json(
      {
        success: true,
        message:
          action === "ACTIVATE"
            ? `Choke mode aktif untuk ${station_id}. Seluruh servo terkunci rapat.`
            : `Choke mode dicabut untuk ${station_id}. Stasiun kembali standby.`,
        data: record,
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Error";
    return NextResponse.json(
      { success: false, error: "Format request salah.", detail: message },
      { status: 400 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    total: overrideHistory.length,
    recent_overrides: overrideHistory.slice(0, 10),
  });
}
