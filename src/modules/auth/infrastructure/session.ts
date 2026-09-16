import "server-only";
import { AsyncLocalStorage } from "async_hooks";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Actor } from "../domain/actorPolicy";
import { signSessionToken, verifySessionToken } from "./jwt";
import { loadActiveUser, loadUserForSession, type Session } from "./authQueries";

export const SESSION_COOKIE = "agaate_session";
export const SESSION_COOKIE_SECURE = "__Host-agaate_session";

export const testSessionContext = new AsyncLocalStorage<{ token?: string }>();

function isSecureContext() {
  if (process.env.APP_SESSION_SECURE === "true") return true;
  if (process.env.APP_SESSION_SECURE === "false") return false;
  return process.env.NODE_ENV === "production";
}

function cookieName() {
  return isSecureContext() ? SESSION_COOKIE_SECURE : SESSION_COOKIE;
}

function readToken(): string | undefined {
  if (process.env.NODE_ENV === "production" && process.env.VITEST == null) {
    return undefined;
  }
  try {
    return testSessionContext.getStore()?.token;
  } catch {
    return undefined;
  }
}

export async function createSession(actor: Actor) {
  const token = await signSessionToken(actor);
  try {
    const jar = await cookies();
    const secure = isSecureContext();
    const name = cookieName();
    try {
      if (name !== SESSION_COOKIE) jar.delete(SESSION_COOKIE);
    } catch {
      /* ignore */
    }
    jar.set(name, token, {
      httpOnly: true,
      secure,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 8,
    });
  } catch {
    // Outside next request context (e.g. tests)
  }
}

export async function clearSession() {
  try {
    const jar = await cookies();
    jar.delete(SESSION_COOKIE);
    try {
      jar.delete(SESSION_COOKIE_SECURE);
    } catch {
      /* ignore */
    }
  } catch {
    // Outside next request context
  }
}

export async function getSession(explicitToken?: string): Promise<Session | null> {
  try {
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
    const payload = await verifySessionToken(token);
    if (!payload || typeof payload.userId !== "string") return null;
    return loadUserForSession(payload.userId);
  } catch {
    return null;
  }
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
  return loadActiveUser(session.userId);
}
