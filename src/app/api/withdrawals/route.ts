import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const balance = await dbService.getUserBalance(session.userId);
  const ledger = await dbService.getUserLedger(session.userId);

  return NextResponse.json({
    balance,
    ledger,
  });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { amount, notes } = await req.json();
    if (!amount || amount < 5000) {
      return NextResponse.json({ error: "Penarikan minimal Rp5.000" }, { status: 400 });
    }

    const withdrawal = await dbService.requestWithdrawal(session.userId, Number(amount), notes);
    return NextResponse.json({ success: true, withdrawal });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
