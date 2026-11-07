import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const banjarId = req.nextUrl.searchParams.get("banjarId") || session?.banjarId || "bjr_kayumas";
  const deposits = await dbService.getBanjarReport(banjarId);
  return NextResponse.json({ deposits });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || (session.role !== "PETUGAS" && session.role !== "ADMIN_BANJAR")) {
    return NextResponse.json({ error: "Hanya petugas/admin yang dapat mencatat setoran" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { citizenId, wasteTypeId, weightKg, imageUrl, aiPredicted, notes } = body;

    if (!citizenId || !wasteTypeId || !weightKg || weightKg <= 0) {
      return NextResponse.json({ error: "Lengkapi data setoran dengan benar" }, { status: 400 });
    }

    const wasteTypes = await dbService.getWasteTypes(session.banjarId);
    const selectedType = wasteTypes.find((w: any) => w.id === wasteTypeId);
    if (!selectedType) {
      return NextResponse.json({ error: "Jenis sampah tidak valid" }, { status: 400 });
    }

    const pricePerKg = selectedType.pricePerKg;
    const totalAmount = Math.round(weightKg * pricePerKg);

    const deposit = await dbService.recordDeposit({
      citizenId,
      operatorId: session.userId,
      wasteTypeId,
      weightKg: Number(weightKg),
      pricePerKg,
      totalAmount,
      imageUrl,
      aiPredicted: Boolean(aiPredicted),
      notes,
    });

    return NextResponse.json({ success: true, deposit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
