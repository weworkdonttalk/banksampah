import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbService } from "@/lib/db-service";
import { getSession } from "@/lib/auth";

const CreateSessionSchema = z.object({
  stationId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const userSession = await getSession();
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized: Silakan login terlebih dahulu" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = CreateSessionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload tidak valid", details: parsed.error.format() }, { status: 400 });
    }

    const { stationId } = parsed.data;

    // Buat sesi setor 5 menit
    const session = await dbService.createDepositSession({
      stationId,
      citizenId: userSession.userId,
    });

    return NextResponse.json({
      success: true,
      session,
      message: "Sesi setor aktif selama 5 menit. Silakan masukkan sampah ke stasiun.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal membuat sesi setor";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
