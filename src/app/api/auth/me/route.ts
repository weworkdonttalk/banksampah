import { NextResponse } from "next/server";
import { getSession, clearSessionCookie } from "@/lib/auth";
import { dbService } from "@/lib/db-service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ authenticated: false, user: null });
  }

  const user = await dbService.getUserById(session.userId);
  return NextResponse.json({
    authenticated: true,
    user: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          banjarId: user.banjarId,
          banjar: user.banjar,
        }
      : session,
  });
}

export async function POST() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
