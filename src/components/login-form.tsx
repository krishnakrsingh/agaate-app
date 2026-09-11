"use client";

import { FormEvent, useState } from "react";
import { Icons } from "./icons";
import { BrandLogo } from "./brand-logo";
import { ThemeToggle } from "./theme-toggle";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [infoNotice, setInfoNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function performLogin(loginId: string, loginPass: string) {
    if (pending) return;
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginId.trim(), password: loginPass }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPending(false);
        setError(body.error ?? "Invalid mobile number, email, or password.");
        return;
      }

      const userRole = body.user?.role;
      let targetUrl = "/dashboard";
      if (userRole === "SUPER_ADMIN") {
        targetUrl = "/hq";
      } else if (userRole === "FARM_ADMIN") {
        targetUrl = "/owner/dashboard";
      } else if (userRole === "FARM_OFFICER") {
        targetUrl = "/officer/day";
      } else if (userRole === "AGRONOMIST") {
        targetUrl = "/agronomy/radar";
      }
      window.location.replace(targetUrl);
    } catch {
      setPending(false);
      setError("Network connectivity error. Please check your connection and try again.");
    }
  }

  async function quickLogin(id: string, pass: string) {
    setIdentifier(id);
    setPassword(pass);
    await performLogin(id, pass);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performLogin(identifier, password);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        maxWidth: 420,
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {/* Top Header: Brand Logo & Theme Toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
          marginBottom: 18,
        }}
      >
        <BrandLogo height={44} priority />

        <ThemeToggle />
      </div>


      {/* Center Form Section */}
      <div style={{ width: "100%", marginBottom: 14 }}>
        <div style={{ marginBottom: 14 }}>
          <h1
            style={{
              margin: "0 0 4px 0",
              fontSize: "clamp(22px, 2.2vw, 26px)",
              fontWeight: 600,
              letterSpacing: "-0.025em",
              color: "var(--ink, #0c0a09)",
              lineHeight: 1.2,
            }}
          >
            Sign in to account
          </h1>
          <p
            style={{
              margin: 0,
              fontSize: "13.5px",
              lineHeight: 1.45,
              color: "var(--muted, #71717a)",
              fontWeight: 400,
            }}
          >
            Enter your credentials to access farm telemetry and field operations.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "11px 14px",
              borderRadius: 12,
              fontSize: "13px",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#991b1b",
              marginBottom: 18,
            }}
          >
            <Icons.AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Info Notice */}
        {infoNotice && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "11px 14px",
              borderRadius: 12,
              fontSize: "12px",
              backgroundColor: "var(--surface-strong, #f4f4f5)",
              color: "var(--body-strong, #18181b)",
              border: "1px solid var(--hairline, #e4e4e7)",
              marginBottom: 18,
            }}
          >
            <span>{infoNotice}</span>
            <button
              type="button"
              onClick={() => setInfoNotice(null)}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: 4,
                color: "var(--muted)",
                display: "flex",
                alignItems: "center",
              }}
            >
              <Icons.X size={14} />
            </button>
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "clamp(10px, 1.4vw, 15px)" }}>
          {/* Mobile Number or Email */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <label
              htmlFor="login-identifier"
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--body-strong, #27272a)",
                letterSpacing: "0.01em",
              }}
            >
              Mobile number or email
            </label>
            <input
              id="login-identifier"
              name="identifier"
              type="text"
              required
              autoFocus
              autoComplete="username"
              placeholder="e.g. admin@agaate.local or 9876543210"
              value={identifier}
              onChange={(e) => {
                setIdentifier(e.target.value);
                if (error) setError("");
              }}
              disabled={pending}
              style={{
                width: "100%",
                height: 42,
                padding: "0 14px",
                fontSize: 14,
                borderRadius: 12,
                border: "1px solid var(--hairline, #e4e4e7)",
                backgroundColor: "var(--canvas-floor, #fafafa)",
                color: "var(--ink, #09090b)",
                outline: "none",
                boxSizing: "border-box",
                transition: "border-color 0.15s ease, box-shadow 0.15s ease",
              }}
            />
          </div>

          {/* Password */}
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label
                htmlFor="login-password"
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "var(--body-strong, #27272a)",
                  letterSpacing: "0.01em",
                }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setInfoNotice("Please contact your estate administrator or HQ to reset credentials.")}
                style={{
                  fontSize: "12px",
                  padding: 0,
                  color: "var(--muted, #71717a)",
                  textDecoration: "none",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                }}
                tabIndex={-1}
              >
                Forgot password?
              </button>
            </div>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
                disabled={pending}
                style={{
                  width: "100%",
                  height: 42,
                  padding: "0 44px 0 14px",
                  fontSize: 14,
                  borderRadius: 12,
                  border: "1px solid var(--hairline, #e4e4e7)",
                  backgroundColor: "var(--canvas-floor, #fafafa)",
                  color: "var(--ink, #09090b)",
                  outline: "none",
                  boxSizing: "border-box",
                  transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                aria-label={showPassword ? "Hide password" : "Show password"}
                style={{
                  position: "absolute",
                  right: 12,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--muted, #71717a)",
                  padding: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? <Icons.EyeOff size={16} /> : <Icons.Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Remember Device Checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingTop: 1 }}>
            <input
              id="login-remember"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: 15,
                height: 15,
                cursor: "pointer",
                borderRadius: 4,
                accentColor: "#1b4332",
              }}
            />
            <label
              htmlFor="login-remember"
              style={{
                fontSize: "12.5px",
                color: "var(--muted, #71717a)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              Remember device for 30 days
            </label>
          </div>

          {/* Submit CTA Button */}
          <button
            type="submit"
            disabled={pending || !identifier.trim() || !password}
            style={{
              width: "100%",
              height: 44,
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 12,
              backgroundColor: "var(--primary-active, #0c0a09)",
              color: "#ffffff",
              border: "none",
              cursor: pending || !identifier.trim() || !password ? "not-allowed" : "pointer",
              opacity: pending || !identifier.trim() || !password ? 0.6 : 1,
              boxShadow: "0 4px 14px rgba(0, 0, 0, 0.12)",
              transition: "all 0.15s ease",
            }}
          >
            <span>{pending ? "Authenticating…" : "Sign In to Operations"}</span>
            {pending ? (
              <Icons.Spinner className="spin" size={16} />
            ) : (
              <Icons.ArrowRight size={16} />
            )}
          </button>
        </form>
      </div>

      {/* Quick Test Profiles (Testing Phase) */}
      <div
        style={{
          width: "100%",
          paddingTop: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            marginBottom: 5,
          }}
        >
          <span
            style={{
              height: 1,
              flex: 1,
              backgroundColor: "var(--hairline, #e4e4e7)",
            }}
          />
          <span
            style={{
              fontSize: "10px",
              fontWeight: 500,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "var(--muted, #a1a1aa)",
              whiteSpace: "nowrap",
            }}
          >
            Quick Test Access
          </span>
          <span
            style={{
              height: 1,
              flex: 1,
              backgroundColor: "var(--hairline, #e4e4e7)",
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 6,
          }}
        >
          <button
            type="button"
            onClick={() => quickLogin("admin@agaate.local", "LocalAdminPassword-ChangeMe-123")}
            disabled={pending}
            title="Super Admin (admin@agaate.local)"
            style={{
              padding: "5px 2px",
              fontSize: "11px",
              fontWeight: 500,
              borderRadius: 8,
              border: "1px solid var(--hairline, #e4e4e7)",
              backgroundColor: "var(--canvas-floor, #fafafa)",
              color: "var(--body-strong, #27272a)",
              cursor: pending ? "not-allowed" : "pointer",
              transition: "all 0.12s ease",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            Super Admin
          </button>
          <button
            type="button"
            onClick={() => quickLogin("farmadmin@agaate.local", "LocalAdminPassword-ChangeMe-123")}
            disabled={pending}
            title="Farm Admin (farmadmin@agaate.local)"
            style={{
              padding: "5px 2px",
              fontSize: "11px",
              fontWeight: 500,
              borderRadius: 8,
              border: "1px solid var(--hairline, #e4e4e7)",
              backgroundColor: "var(--canvas-floor, #fafafa)",
              color: "var(--body-strong, #27272a)",
              cursor: pending ? "not-allowed" : "pointer",
              transition: "all 0.12s ease",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            Farm Admin
          </button>
          <button
            type="button"
            onClick={() => quickLogin("officer@agaate.local", "LocalAdminPassword-ChangeMe-123")}
            disabled={pending}
            title="Farm Officer (officer@agaate.local)"
            style={{
              padding: "5px 2px",
              fontSize: "11px",
              fontWeight: 500,
              borderRadius: 8,
              border: "1px solid var(--hairline, #e4e4e7)",
              backgroundColor: "var(--canvas-floor, #fafafa)",
              color: "var(--body-strong, #27272a)",
              cursor: pending ? "not-allowed" : "pointer",
              transition: "all 0.12s ease",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            Farm Officer
          </button>
          <button
            type="button"
            onClick={() => quickLogin("agronomist@agaate.local", "LocalAdminPassword-ChangeMe-123")}
            disabled={pending}
            title="Agronomist (agronomist@agaate.local)"
            style={{
              padding: "5px 2px",
              fontSize: "11px",
              fontWeight: 500,
              borderRadius: 8,
              border: "1px solid var(--hairline, #e4e4e7)",
              backgroundColor: "var(--canvas-floor, #fafafa)",
              color: "var(--body-strong, #27272a)",
              cursor: pending ? "not-allowed" : "pointer",
              transition: "all 0.12s ease",
              textAlign: "center",
              lineHeight: 1.2,
            }}
          >
            Agronomist
          </button>
        </div>
      </div>
    </div>
  );
}

