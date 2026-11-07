import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || (session.role !== "PETUGAS" && session.role !== "ADMIN_BANJAR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const approved = await dbService.approveWithdrawal(id, session.name);
    return NextResponse.json({ success: true, withdrawal: approved });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
