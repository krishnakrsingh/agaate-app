import "server-only";
import { AsyncLocalStorage } from "async_hooks";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { actorSelect, buildActor, type Actor } from "@/lib/actor";
import type { Permission } from "@/lib/rbac";

export const SESSION_COOKIE = "agaate_session";
export const SESSION_COOKIE_SECURE = "__Host-agaate_session";
const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET ?? "");

export const testSessionContext = new AsyncLocalStorage<{ token?: string }>();

export type Session = {
  userId: string;
  role: Role;
  roleSlug: string;
  roleLabel: string;
  permissions: Permission[];
  name: string;
};

const LEGACY_ROLES = new Set<Role>(["SUPER_ADMIN", "OPERATIONS_MANAGER", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"]);

function requireSecret() { if (secret.length < 32) throw new Error("APP_SESSION_SECRET must be set to a random value of at least 32 characters."); }

function isSecureContext() {
  if (process.env.APP_SESSION_SECURE === "true") return true;
  if (process.env.APP_SESSION_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

function cookieName() { return isSecureContext() ? SESSION_COOKIE_SECURE : SESSION_COOKIE; }

function readToken(): string | undefined {
  if (process.env.NODE_ENV === "production" && process.env.VITEST == null) {
    return undefined;
  }
  try { return testSessionContext.getStore()?.token; } catch { return undefined; }
}

export async function createSession(actor: Actor) {
  requireSecret();
  if (!LEGACY_ROLES.has(actor.role)) throw new Error("Invalid role for session.");
  const { randomUUID } = await import("crypto");
  const token = await new SignJWT({
    userId: actor.id,
    role: actor.role,
    roleSlug: actor.roleSlug,
    name: actor.name,
    jti: randomUUID(),
    iss: "agaate",
    aud: "agaate-app",
  }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret);
  try {
    const jar = await cookies();
    const secure = isSecureContext();
    const name = cookieName();
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

async function loadUserForSession(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: actorSelect,
  });
  if (!user?.active) return null;
  if (user.roleDefinition && !user.roleDefinition.active) return null;
  const actor = buildActor(user);
  return {
    userId: actor.id,
    role: actor.role,
    roleSlug: actor.roleSlug,
    roleLabel: actor.roleLabel,
    permissions: actor.permissions,
    name: actor.name,
  } satisfies Session;
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
    if (payload.iss != null && payload.iss !== "agaate") return null;
    const aud = (payload as Record<string, unknown>).aud;
    if (aud != null && aud !== "agaate-app" && !(Array.isArray(aud) && (aud as string[]).includes("agaate-app"))) return null;
    if (typeof payload.userId !== "string" || typeof payload.name !== "string") return null;
    return loadUserForSession(payload.userId);
  } catch { return null; }
}

export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  const refreshed = await loadUserForSession(session.userId);
  if (!refreshed) {
    await clearSession();
    redirect("/login");
  }
  return refreshed;
}

export async function requireActiveUser(): Promise<Actor> {
  const session = await getSession();
  if (!session) throw new Error("Unauthenticated");
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: actorSelect,
  });
  if (!user?.active) throw new Error("Account is unavailable");
  if (user.roleDefinition && !user.roleDefinition.active) throw new Error("Account is unavailable");
  return buildActor(user);
}
