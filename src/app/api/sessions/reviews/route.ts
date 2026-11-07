import { NextResponse } from "next/server";
import { dbService } from "@/lib/db-service";
import { getSession } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getSession();
    if (!user || (user.role !== "PETUGAS" && user.role !== "ADMIN_BANJAR")) {
      return NextResponse.json({ error: "Unauthorized: Khusus petugas atau admin banjar" }, { status: 401 });
    }

    const sessions = await dbService.getPendingReviewSessions(user.banjarId);
    return NextResponse.json({ success: true, reviews: sessions });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
