import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== "ADMIN_BANJAR" && session.role !== "PETUGAS")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const resolved = await dbService.resolveAlert(id, session.name);
  return NextResponse.json({ success: true, alert: resolved });
}
