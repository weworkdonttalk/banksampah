import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Every role only receives stations from its own Banjar.
  const banjarId = session.banjarId;

  let stations;
  if (banjarId) {
    stations = await dbService.getStationsByBanjar(banjarId);
  } else {
    stations = await dbService.getAllStations();
  }

  // Tambahkan evaluasi status online (>60 detik tanpa data = OFFLINE)
  const now = Date.now();
  const enhancedStations = stations.map((st: any) => {
    const latestReading = st.readings?.[0] || null;
    const isOnline = latestReading
      ? now - new Date(latestReading.createdAt).getTime() <= 60 * 1000
      : false;

    let status: "AMAN" | "WASPADA" | "BAHAYA" = "AMAN";
    if (st.alerts && st.alerts.length > 0) {
      const hasDanger = st.alerts.some((a: any) => a.level === "BAHAYA");
      status = hasDanger ? "BAHAYA" : "WASPADA";
    }

    return {
      ...st,
      isOnline,
      status,
      latestReading,
    };
  });

  return NextResponse.json({
    stations: enhancedStations,
    timestamp: new Date().toISOString(),
  });
}
