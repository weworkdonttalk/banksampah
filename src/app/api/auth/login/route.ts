import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { dbService } from "@/lib/db-service";
import { setSessionCookie } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(6, "Kata sandi minimal 6 karakter"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Input tidak valid" }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const user = await dbService.getUserByEmail(email);

    if (!user) {
      return NextResponse.json({ error: "Email atau kata sandi salah" }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: "Email atau kata sandi salah" }, { status: 401 });
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      banjarId: user.banjarId,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        banjarId: user.banjarId,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Gagal masuk" }, { status: 500 });
  }
}
