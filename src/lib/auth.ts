import "server-only";
import { AsyncLocalStorage } from "async_hooks";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "agaate_session";
const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET ?? "");

export const testSessionContext = new AsyncLocalStorage<{ token?: string }>();

export type Session = { userId: string; role: "SUPER_ADMIN" | "FARM_ADMIN" | "AGRONOMIST" | "FARM_OFFICER"; name: string };

function requireSecret() { if (secret.length < 32) throw new Error("APP_SESSION_SECRET must be set to a random value of at least 32 characters."); }

export async function createSession(session: Session) {
  requireSecret();
  const token = await new SignJWT(session).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret);
  try {
    const jar = await cookies();
    const secure = process.env.APP_SESSION_SECURE === "true";
    jar.set(SESSION_COOKIE, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  } catch {
    // Outside next request context (e.g. tests)
  }
}

export async function clearSession() {
  try {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
  } catch {
    // Outside next request context
  }
}

export async function getSession(explicitToken?: string): Promise<Session | null> {
  try {
    requireSecret();
    let token = explicitToken ?? testSessionContext.getStore()?.token;
    if (!token) {
      try {
        const jar = await cookies();
        token = jar.get(SESSION_COOKIE)?.value;
      } catch {
        // outside next request context
      }
    }
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    if (typeof payload.userId !== "string" || typeof payload.role !== "string" || typeof payload.name !== "string") return null;
    return { userId: payload.userId, role: payload.role as Session["role"], name: payload.name };
  } catch { return null; }
}

export async function requireSession() { const session = await getSession(); if (!session) redirect("/login"); const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, role: true, active: true } }); if (!user?.active) { await clearSession(); redirect("/login"); } return { userId: user.id, name: user.name, role: user.role } satisfies Session; }

export async function requireActiveUser() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, active: true } });
  if (!user?.active) throw new Error("Account is unavailable");
  return user;
}
