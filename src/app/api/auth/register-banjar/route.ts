import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { dbService } from "@/lib/db-service";
import { setSessionCookie } from "@/lib/auth";

const RegisterSchema = z.object({
  kode: z.string().min(3, "Kode banjar minimal 3 karakter").toUpperCase(),
  namaBanjar: z.string().min(3, "Nama banjar minimal 3 karakter"),
  kecamatan: z.string().default("Denpasar Selatan"),
  kabupaten: z.string().default("Denpasar"),
  adminName: z.string().min(2, "Nama admin minimal 2 karakter"),
  adminEmail: z.string().email("Email tidak valid"),
  adminPassword: z.string().min(6, "Password minimal 6 karakter"),
  adminPhone: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Input tidak valid" }, { status: 400 });
    }

    const existingUser = await dbService.getUserByEmail(parsed.data.adminEmail);
    if (existingUser) {
      return NextResponse.json({ error: "Email sudah terdaftar" }, { status: 400 });
    }

    const { banjar, admin } = await dbService.registerBanjarWithAdmin(parsed.data);

    await setSessionCookie({
      userId: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      banjarId: banjar.id,
    });

    return NextResponse.json({
      success: true,
      banjar: { id: banjar.id, nama: banjar.nama, kode: banjar.kode },
      user: { id: admin.id, name: admin.name, email: admin.email, role: admin.role },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal mendaftarkan banjar" }, { status: 500 });
  }
}
