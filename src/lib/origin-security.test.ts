import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { assertSameOrigin } from "@infrastructure/security";

describe("assertSameOrigin Security Guard", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("allows reverse-proxied request where Host is localhost but X-Forwarded-Host matches origin", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        "x-forwarded-host": "agaate.sahilraj.com",
        "x-forwarded-proto": "https",
        origin: "https://agaate.sahilraj.com",
      },
    });

    expect(() => assertSameOrigin(req)).not.toThrow();
  });

  it("allows reverse-proxied request when X-Forwarded-Host includes standard port 443", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        "x-forwarded-host": "agaate.sahilraj.com:443",
        origin: "https://agaate.sahilraj.com",
      },
    });

    expect(() => assertSameOrigin(req)).not.toThrow();
  });

  it("allows reverse-proxied request with multi-hop comma-separated X-Forwarded-Host", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "10.0.0.5:3000",
        "x-forwarded-host": "agaate.sahilraj.com, internal-edge-proxy",
        origin: "https://agaate.sahilraj.com",
      },
    });

    expect(() => assertSameOrigin(req)).not.toThrow();
  });

  it("allows request matching via Referer header when Origin is absent", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        "x-forwarded-host": "agaate.sahilraj.com",
        referer: "https://agaate.sahilraj.com/login",
      },
    });

    expect(() => assertSameOrigin(req)).not.toThrow();
  });

  it("allows request configured via ALLOWED_ORIGINS or APP_URL env vars", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.ALLOWED_ORIGINS = "https://tenant.agaate.ag, https://agaate.sahilraj.com";
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        origin: "https://tenant.agaate.ag",
      },
    });

    expect(() => assertSameOrigin(req)).not.toThrow();
  });

  it("allows requests with no Origin and no Referer (mobile native app / curl)", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "agaate.sahilraj.com",
      },
    });

    expect(() => assertSameOrigin(req)).not.toThrow();
  });

  it("rejects cross-origin CSRF attempts from malicious origins", () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const req = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        host: "localhost:3000",
        "x-forwarded-host": "agaate.sahilraj.com",
        origin: "https://attacker.evil.com",
      },
    });

    expect(() => assertSameOrigin(req)).toThrow("Cross-origin request rejected.");
  });
});
