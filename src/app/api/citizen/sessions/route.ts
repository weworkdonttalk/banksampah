import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function GET() {
  try {
    const user = await getSession();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [sessions, balance, ledger, tariff] = await Promise.all([
      dbService.getCitizenSessions(user.userId),
      dbService.getUserBalance(user.userId),
      dbService.getUserLedger(user.userId),
      dbService.getStationTariff(user.banjarId),
    ]);

    return NextResponse.json({
      success: true,
      balance,
      tariff,
      sessions,
      ledger,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
