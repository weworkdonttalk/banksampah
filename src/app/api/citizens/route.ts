import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function GET(req: NextRequest) {
  const session = await getSession();
  const banjarId = req.nextUrl.searchParams.get("banjarId") || session?.banjarId || "bjr_kayumas";
  const citizens = await dbService.getCitizens(banjarId);
  return NextResponse.json({ citizens });
}
