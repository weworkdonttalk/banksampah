import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const banjarId = req.nextUrl.searchParams.get("banjarId") || session?.banjarId || "bjr_kayumas";
  const wasteTypes = await dbService.getWasteTypes(banjarId);
  return NextResponse.json({ wasteTypes });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN_BANJAR") {
    return NextResponse.json({ error: "Hanya Admin Banjar yang dapat menambah jenis sampah" }, { status: 403 });
  }

  const body = await req.json();
  const { kode, nama, category, pricePerKg, unit = "kg" } = body;

  if (!kode || !nama || !pricePerKg) {
    return NextResponse.json({ error: "Data jenis sampah tidak lengkap" }, { status: 400 });
  }

  const created = await dbService.createWasteType({
    banjarId: session.banjarId,
    kode,
    nama,
    category: category || "ANORGANIK_PLASTIK",
    pricePerKg: Number(pricePerKg),
    unit,
  });

  return NextResponse.json({ success: true, wasteType: created });
}
