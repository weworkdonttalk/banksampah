import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbService } from "@/lib/db-service";
import { getSession } from "@/lib/auth";

const ReviewDecisionSchema = z.object({
  decision: z.enum(["APPROVE_AS_IS", "CORRECT_CATEGORY", "REJECT"]),
  finalCategory: z.enum(["ORGANIK", "ANORGANIK"]).optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getSession();
    if (!user || (user.role !== "PETUGAS" && user.role !== "ADMIN_BANJAR")) {
      return NextResponse.json({ error: "Unauthorized: Khusus petugas" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const parsed = ReviewDecisionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Payload keputusan tidak valid", details: parsed.error.format() }, { status: 400 });
    }

    const updated = await dbService.officerReviewSession(id, {
      officerId: user.userId,
      decision: parsed.data.decision,
      finalCategory: parsed.data.finalCategory,
      notes: parsed.data.notes,
    });

    return NextResponse.json({
      success: true,
      session: updated,
      message: `Tinjauan selesai dengan keputusan: ${parsed.data.decision}`,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Gagal memproses tinjauan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
