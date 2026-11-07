import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbService } from "@/lib/db-service";
import { getSession } from "@/lib/auth";

const UpdateTariffSchema = z.object({
  organicRate: z.number().min(0),
  inorganicRate: z.number().min(0),
  subRatesJson: z.string().optional(),
});

export async function GET() {
  try {
    const user = await getSession();
    const banjarId = user?.banjarId || "bjr_kayumas";
    const tariff = await dbService.getStationTariff(banjarId);
    return NextResponse.json({ success: true, tariff });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const user = await getSession();
    if (!user || user.role !== "ADMIN_BANJAR") {
      return NextResponse.json({ error: "Unauthorized: Khusus Admin Banjar" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = UpdateTariffSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Data tarif tidak valid", details: parsed.error.format() }, { status: 400 });
    }

    const updated = await dbService.updateStationTariff(user.banjarId, parsed.data);
    return NextResponse.json({
      success: true,
      tariff: updated,
      message: "Tarif flat setoran berhasil diperbarui",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memperbarui tarif";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
