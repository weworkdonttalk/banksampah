import { NextResponse } from "next/server";
import { DepositRecord } from "@/lib/mock-telemetry";

const depositLedger: DepositRecord[] = [
  {
    id: "tx-init-01",
    userId: "user-01",
    userName: "Wayan Sudiarta",
    wasteType: "INORGANIC",
    weightGram: 1200,
    pointsEarned: 1440,
    co2SavedKg: 2.4,
    createdAt: new Date().toISOString(),
  },
];

const RATES = {
  ORGANIC: { pointsPerGram: 0.5, co2PerGram: 0.0005 },
  INORGANIC: { pointsPerGram: 1.2, co2PerGram: 0.002 },
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  const results = userId
    ? depositLedger.filter((d) => d.userId === userId)
    : depositLedger;

  const totalPoints = results.reduce((acc, cur) => acc + cur.pointsEarned, 0);
  const totalCo2 = Number(
    results.reduce((acc, cur) => acc + cur.co2SavedKg, 0).toFixed(3)
  );

  return NextResponse.json({
    success: true,
    total_records: results.length,
    summary: {
      total_points: totalPoints,
      total_co2_saved_kg: totalCo2,
    },
    data: results,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, userName, wasteType, weightGram } = body;

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: "userId wajib disertakan." },
        { status: 400 }
      );
    }

    if (wasteType !== "ORGANIC" && wasteType !== "INORGANIC") {
      return NextResponse.json(
        { success: false, error: "wasteType wajib ORGANIC atau INORGANIC." },
        { status: 400 }
      );
    }

    if (typeof weightGram !== "number" || weightGram <= 0 || weightGram > 50000) {
      return NextResponse.json(
        { success: false, error: "weightGram wajib angka positif maksimum 50.000g." },
        { status: 400 }
      );
    }

    const rate = RATES[wasteType as "ORGANIC" | "INORGANIC"];
    const pointsEarned = Math.round(weightGram * rate.pointsPerGram);
    const co2SavedKg = Number((weightGram * rate.co2PerGram).toFixed(3));

    const record: DepositRecord = {
      id: "tx-" + Math.random().toString(36).slice(2, 10),
      userId,
      userName: userName || "Warga Banjar",
      wasteType,
      weightGram,
      pointsEarned,
      co2SavedKg,
      createdAt: new Date().toISOString(),
    };

    depositLedger.unshift(record);

    return NextResponse.json(
      {
        success: true,
        message: "Setoran berhasil diverifikasi dan poin telah dikreditkan.",
        data: record,
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Error";
    return NextResponse.json(
      { success: false, error: "Payload tidak valid.", detail: message },
      { status: 400 }
    );
  }
}
