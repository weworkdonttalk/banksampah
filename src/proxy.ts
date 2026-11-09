import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "ecosort_session";

function decodeJwtPayload(token: string | undefined): { role?: string } | null {
  if (!token) return null;
  try {
    const [, encodedPayload] = token.split(".");
    if (!encodedPayload) return null;
    const json = Buffer.from(encodedPayload, "base64").toString("utf-8");
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(COOKIE_NAME)?.value;
  const payload = decodeJwtPayload(token);
  const role = payload?.role;

  const isProtectedRoute =
    pathname.startsWith("/warga") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/petugas") ||
    pathname.startsWith("/admin");
  const isAdminRoute = pathname.startsWith("/admin");
  const isOperatorRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/petugas");

  if (!isProtectedRoute) return NextResponse.next();

  // No session -> redirect to /login
  if (!role) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // WARGA trying to access operator/dashboard/admin routes -> redirect to /warga
  if (role === "WARGA" && isOperatorRoute) {
    const wargaUrl = new URL("/warga", req.url);
    wargaUrl.searchParams.set("restricted", "true");
    return NextResponse.redirect(wargaUrl);
  }

  // PETUGAS trying to access /admin -> redirect to /petugas
  if (isAdminRoute && role !== "ADMIN_BANJAR") {
    const petugasUrl = new URL(role === "PETUGAS" ? "/petugas" : "/warga", req.url);
    return NextResponse.redirect(petugasUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/warga/:path*", "/dashboard/:path*", "/petugas/:path*", "/admin/:path*"],
};
