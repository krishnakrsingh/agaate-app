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

  let candidate: string | null = null;
  try {
    if (origin) {
      candidate = new URL(origin).origin;
    } else if (referer) {
      candidate = new URL(referer).origin;
    }
  } catch {
    const err = new Error("Cross-origin request rejected.");
    (err as unknown as Record<string, unknown>).status = 403;
    throw err;
  }
  if (!candidate) return;

  const allowed = new Set<string>();
  const addCandidate = (raw: string | null | undefined) => {
    if (!raw) return;
    for (const item of raw.split(",")) {
      const val = item.trim();
      if (!val) continue;
      try {
        if (val.startsWith("http://") || val.startsWith("https://")) {
          const u = new URL(val);
          allowed.add(u.origin);
          if (u.port === "443") allowed.add(`https://${u.hostname}`);
          if (u.port === "80") allowed.add(`http://${u.hostname}`);
        } else {
          const hostOnly = val.replace(/\/.*$/, "");
          allowed.add(`https://${hostOnly}`);
          allowed.add(`http://${hostOnly}`);
          if (hostOnly.includes(":443")) allowed.add(`https://${hostOnly.replace(/:443$/, "")}`);
          if (hostOnly.includes(":80")) allowed.add(`http://${hostOnly.replace(/:80$/, "")}`);
        }
      } catch {
        // ignore malformed
      }
    }
  };

  addCandidate(request.headers.get("x-forwarded-host"));
  addCandidate(request.headers.get("host"));
  addCandidate(request.headers.get("x-forwarded-server"));

  addCandidate(process.env.WEBAUTHN_ORIGIN);
  addCandidate(process.env.APP_URL);
  addCandidate(process.env.NEXT_PUBLIC_APP_URL);
  addCandidate(process.env.ALLOWED_ORIGINS);
  addCandidate(process.env.NEXTAUTH_URL);

  if (process.env.NODE_ENV !== "production") {
    allowed.add("http://localhost");
    allowed.add("http://127.0.0.1");
    allowed.add("https://localhost");
    allowed.add("https://127.0.0.1");
    const hostHeader = request.headers.get("host") || "";
    const portMatch = hostHeader.match(/:(\d+)$/);
    if (portMatch) {
      allowed.add(`http://localhost:${portMatch[1]}`);
      allowed.add(`http://127.0.0.1:${portMatch[1]}`);
      allowed.add(`https://localhost:${portMatch[1]}`);
      allowed.add(`https://127.0.0.1:${portMatch[1]}`);
    }
  }

  if (allowed.has(candidate)) return;

  try {
    const candUrl = new URL(candidate);
    const candHost = candUrl.host.toLowerCase();
    const candHostname = candUrl.hostname.toLowerCase();
    const allHosts = [
      request.headers.get("x-forwarded-host"),
      request.headers.get("host"),
      request.headers.get("x-forwarded-server"),
    ];
    for (const h of allHosts) {
      if (!h) continue;
      for (const piece of h.split(",")) {
        const clean = piece.trim().toLowerCase().replace(/\/.*$/, "");
        if (clean === candHost || clean === candHostname || clean.replace(/:(443|80)$/, "") === candHostname) {
          return;
        }
      }
    }
  } catch {
    // ignore
  }

  const err = new Error("Cross-origin request rejected.");
  (err as unknown as Record<string, unknown>).status = 403;
  throw err;
}

/** Storage keys must be app-generated evidence paths — never URLs, .., or absolute paths. */
export function assertSafeStorageKey(key: string): void {
  if (!key.startsWith("evidence/") || key.includes("..") || key.startsWith("/") || /\s/.test(key) || key.length > 512) {
    const err = new Error("Invalid storage key.");
    (err as unknown as Record<string, unknown>).status = 400;
    throw err;
  }
}
