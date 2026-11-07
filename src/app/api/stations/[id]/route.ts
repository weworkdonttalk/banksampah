import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const hours = Number(req.nextUrl.searchParams.get("hours") || "24");
  const readings = await dbService.getStationReadings(id, hours);
  return NextResponse.json({ readings });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN_BANJAR" && session.role !== "PETUGAS")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const updated = await dbService.updateStationThresholds(id, {
    tempWarnThreshold: body.tempWarnThreshold ? Number(body.tempWarnThreshold) : undefined,
    tempDangerThreshold: body.tempDangerThreshold ? Number(body.tempDangerThreshold) : undefined,
    smokeWarnThreshold: body.smokeWarnThreshold ? Number(body.smokeWarnThreshold) : undefined,
    smokeDangerThreshold: body.smokeDangerThreshold ? Number(body.smokeDangerThreshold) : undefined,
  });

  return NextResponse.json({ success: true, station: updated });
}
