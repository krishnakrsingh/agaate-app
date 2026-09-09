import "server-only";
import { AsyncLocalStorage } from "async_hooks";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "agaate_session";
export const SESSION_COOKIE_SECURE = "__Host-agaate_session";
const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET ?? "");

export const testSessionContext = new AsyncLocalStorage<{ token?: string }>();

export type Session = { userId: string; role: "SUPER_ADMIN" | "FARM_ADMIN" | "AGRONOMIST" | "FARM_OFFICER"; name: string };

const VALID_ROLES = new Set(["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"]);

function requireSecret() { if (secret.length < 32) throw new Error("APP_SESSION_SECRET must be set to a random value of at least 32 characters."); }

function isSecureContext() {
  if (process.env.APP_SESSION_SECURE === "true") return true;
  if (process.env.APP_SESSION_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

function cookieName() { return isSecureContext() ? SESSION_COOKIE_SECURE : SESSION_COOKIE; }

function readToken(): string | undefined {
  if (process.env.NODE_ENV === "production" && process.env.VITEST == null) {
    // Never allow test bypass in production.
    return undefined;
  }
  try { return testSessionContext.getStore()?.token; } catch { return undefined; }
}

export async function createSession(session: Session) {
  requireSecret();
  if (!VALID_ROLES.has(session.role)) throw new Error("Invalid role for session.");
  const { randomUUID } = await import("crypto");
  const token = await new SignJWT({ ...session, jti: randomUUID(), iss: "agaate", aud: "agaate-app" }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret);
  try {
    const jar = await cookies();
    const secure = isSecureContext();
    const name = cookieName();
    // Clear legacy cookie name on rotation so only one valid cookie exists.
    try { if (name !== SESSION_COOKIE) jar.delete(SESSION_COOKIE); } catch { /* ignore */ }
    jar.set(name, token, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 60 * 60 * 8 });
  } catch {
    // Outside next request context (e.g. tests)
  }
}

export async function clearSession() {
  try {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    try { jar.delete(SESSION_COOKIE_SECURE); } catch { /* ignore */ }
  } catch {
    // Outside next request context
  }
}

export async function getSession(explicitToken?: string): Promise<Session | null> {
  try {
    requireSecret();
    let token = explicitToken ?? readToken();
    if (!token) {
      try {
        const jar = await cookies();
        token = jar.get(SESSION_COOKIE_SECURE)?.value ?? jar.get(SESSION_COOKIE)?.value;
      } catch {
        // outside next request context
      }
    }
    if (!token) return null;
    const { payload } = await jwtVerify(token, secret);
    // New sessions carry iss/aud; legacy/test tokens may omit them. If present they must match.
    if (payload.iss != null && payload.iss !== "agaate") return null;
    const aud = (payload as Record<string, unknown>).aud;
    if (aud != null && aud !== "agaate-app" && !(Array.isArray(aud) && (aud as string[]).includes("agaate-app"))) return null;
    if (typeof payload.userId !== "string" || typeof payload.role !== "string" || typeof payload.name !== "string") return null;
    if (!VALID_ROLES.has(payload.role)) return null;
    // Never trust the JWT role claim alone: re-validate account liveness + authoritative role.
    try {
      const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { id: true, name: true, role: true, active: true } });
      if (!user?.active) return null;
      return { userId: user.id, role: user.role, name: user.name };
    } catch {
      return null;
    }
  } catch { return null; }
}

export async function requireSession() { const session = await getSession(); if (!session) redirect("/login"); const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, role: true, active: true } }); if (!user?.active) { await clearSession(); redirect("/login"); } return { userId: user.id, name: user.name, role: user.role } satisfies Session; }

export async function requireActiveUser() {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, name: true, email: true, role: true, active: true, clientId: true } });
  if (!user?.active) throw new Error("Account is unavailable");
  return user;
}
