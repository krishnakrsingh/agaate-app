import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function isApiMutation(request: NextRequest) {
  return request.nextUrl.pathname.startsWith("/api/") && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
}

function originAllowed(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  if (!origin && !referer) return true;
  const host = request.headers.get("host") ?? request.headers.get("x-forwarded-host") ?? "";
  if (!host) return true;
  const candidates = new Set([`http://${host}`, `https://${host}`]);
  const configured = process.env.WEBAUTHN_ORIGIN?.trim().replace(/\/$/, "");
  if (configured) candidates.add(configured);
  try {
    if (origin) return candidates.has(origin);
    return candidates.has(new URL(referer!).origin);
  } catch {
    return false;
  }
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
