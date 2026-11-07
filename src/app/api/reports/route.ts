import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const banjarId = req.nextUrl.searchParams.get("banjarId") || session?.banjarId || "bjr_kayumas";
  const format = req.nextUrl.searchParams.get("format");

  const deposits = await dbService.getBanjarReport(banjarId);

  if (format === "csv") {
    // Generate CSV string
    const headers = ["ID Setoran", "Tanggal", "ID Warga", "Jenis Sampah", "Berat (kg)", "Harga/kg", "Total (Rp)", "AI Terdeteksi"];
    const rows = deposits.map((d: any) => [
      d.id,
      new Date(d.createdAt).toISOString(),
      d.citizenId,
      d.wasteType?.nama || "-",
      d.weightKg,
      d.pricePerKg,
      d.totalAmount,
      d.aiPredicted ? "YA" : "TIDAK",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="laporan-sampah-${banjarId}-${Date.now()}.csv"`,
      },
    });
  }

  // Ringkasan agregat
  const totalKg = deposits.reduce((acc: number, cur: any) => acc + cur.weightKg, 0);
  const totalRupiah = deposits.reduce((acc: number, cur: any) => acc + cur.totalAmount, 0);

  // Breakdown per jenis sampah
  const breakdownMap: Record<string, { nama: string; kg: number; rupiah: number }> = {};
  for (const d of deposits) {
    const key = d.wasteTypeId;
    const name = d.wasteType?.nama || "Lain-lain";
    if (!breakdownMap[key]) {
      breakdownMap[key] = { nama: name, kg: 0, rupiah: 0 };
    }
    breakdownMap[key].kg += d.weightKg;
    breakdownMap[key].rupiah += d.totalAmount;
  }

  return NextResponse.json({
    totalKg: Number(totalKg.toFixed(2)),
    totalRupiah,
    totalTransactions: deposits.length,
    breakdown: Object.values(breakdownMap),
    recentDeposits: deposits.slice(0, 20),
  });
}
