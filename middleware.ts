import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isApiMutation(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
}

function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (!origin && !referer) return true;

  let candidate: string | null = null;
  try {
    if (origin) {
      candidate = new URL(origin).origin;
    } else if (referer) {
      candidate = new URL(referer).origin;
    }
  } catch {
    return false;
  }
  if (!candidate) return true;

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
  try {
    if (request.nextUrl?.origin) addCandidate(request.nextUrl.origin);
  } catch {
    // ignore
  }

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

  if (allowed.has(candidate)) return true;

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
          return true;
        }
      }
    }
  } catch {
    // ignore
  }

  return false;
}

export function middleware(request: NextRequest) {
  // Global CSRF guard for cookie-authed API mutations.
  if (isApiMutation(request) && !originAllowed(request)) {
    return NextResponse.json({ error: "Cross-origin request rejected." }, { status: 403 });
  }
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(self), geolocation=(self), microphone=()");
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
  }
  return res;
}

export const config = { matcher: ["/api/:path*", "/((?!_next/static|_next/image|favicon.ico).*)"] };
