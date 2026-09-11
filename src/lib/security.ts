import "server-only";

/** Client IP behind proxies: first X-Forwarded-For entry, validated. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first.length > 0 && first.length <= 45) return first;
  }
  return headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

/**
 * CSRF guard for cookie-authed mutations. SameSite=Lax blocks most cross-site
 * POSTs, but a misconfigured proxy/CORS or top-level GET confusion can bypass
 * it. Reject state-changing /api requests whose Origin/Referer doesn't match Host.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (!origin && !referer) return; // same-origin fetch / curl / mobile: no signal
  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? "";
  if (!host) return;
  const expectedProto = process.env.NODE_ENV === "production" ? "https" : "http";
  const allowed = new Set([
    `${expectedProto}://${host}`,
    `http://${host}`,
    `https://${host}`,
  ]);
  // Also allow configured app origin (e.g. WEBAUTHN_ORIGIN) if set.
  const configured = process.env.WEBAUTHN_ORIGIN?.trim();
  if (configured) allowed.add(configured.replace(/\/$/, ""));
  const candidate = origin ?? (referer ? new URL(referer).origin : null);
  if (candidate && !allowed.has(candidate)) {
    const err = new Error("Cross-origin request rejected.");
    (err as unknown as Record<string, unknown>).status = 403;
    throw err;
  }
}

/** Storage keys must be app-generated evidence paths — never URLs, .., or absolute paths. */
export function assertSafeStorageKey(key: string): void {
  if (!key.startsWith("evidence/") || key.includes("..") || key.startsWith("/") || /\s/.test(key) || key.length > 512) {
    const err = new Error("Invalid storage key.");
    (err as unknown as Record<string, unknown>).status = 400;
    throw err;
  }
}
