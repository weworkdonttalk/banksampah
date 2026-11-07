import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "ecosort-secret-key-bali-digifest-2026-supersecure";
const COOKIE_NAME = "ecosort_session";

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  banjarId: string;
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(payload: SessionPayload) {
  const cookieStore = await cookies();
  const token = signToken(payload);
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
