import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const banjarId = req.nextUrl.searchParams.get("banjarId") || session?.banjarId || "bjr_kayumas";
  const format = req.nextUrl.searchParams.get("format");

  const deposits = (await dbService.getBanjarReport(banjarId)) as any[];

  if (format === "csv") {
    // Generate CSV string
    const headers = [
      "ID Sesi",
      "Tanggal",
      "ID Warga",
      "Kategori Warga",
      "Kategori AI",
      "Reward (Rp)",
      "Koreksi AI",
      "Status",
    ];
    const rows = deposits.map((d: any) => [
      d.sessionCode || d.id,
      new Date(d.createdAt).toISOString(),
      d.citizenId,
      d.userCategory || d.wasteType?.nama || "ORGANIK",
      d.aiCategory || (d.aiPredicted ? "AI" : "-"),
      d.rewardAmount ?? d.totalAmount ?? 0,
      d.isCorrected ? "YA" : "TIDAK",
      d.status || "COMPLETED",
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
  const totalRupiah = deposits.reduce(
    (acc: number, cur: any) => acc + (cur.rewardAmount ?? cur.totalAmount ?? 0),
    0
  );
  const totalCorrected = deposits.filter((d: any) => d.isCorrected).length;
  const organicCount = deposits.filter(
    (d: any) => (d.userCategory || "").toLowerCase() === "organik" || (d.aiCategory || "").toLowerCase() === "organik"
  ).length;
  const inorganicCount = deposits.filter(
    (d: any) => (d.userCategory || "").toLowerCase() === "anorganik" || (d.aiCategory || "").toLowerCase() === "anorganik"
  ).length;

  return NextResponse.json({
    totalRupiah,
    totalTransactions: deposits.length,
    totalCorrected,
    organicCount,
    inorganicCount,
    recentDeposits: deposits.slice(0, 20),
  });
}
