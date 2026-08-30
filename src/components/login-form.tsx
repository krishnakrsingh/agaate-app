"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";

const DEMO_ACCOUNTS = [
  {
    role: "Super Admin",
    badge: "Global Director",
    email: "admin@agaate.local",
    password: "LocalAdminPassword-ChangeMe-123",
    color: "var(--primary-700)",
  },
  {
    role: "Farm Admin",
    badge: "Operations Manager",
    email: "farmadmin@agaate.local",
    password: "LocalAdminPassword-ChangeMe-123",
    color: "var(--primary-600)",
  },
  {
    role: "Agronomist",
    badge: "Central Agronomy",
    email: "agronomist@agaate.local",
    password: "LocalAdminPassword-ChangeMe-123",
    color: "var(--sky-blue)",
  },
  {
    role: "Farm Officer",
    badge: "Field Execution",
    email: "officer@agaate.local",
    password: "LocalAdminPassword-ChangeMe-123",
    color: "var(--harvest-amber)",
  },
];

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  function quickFill(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const body = await response.json().catch(() => ({}));
      setPending(false);

      if (!response.ok) {
        setError(body.error ?? "Unable to sign in. Please verify your credentials.");
        return;
      }

      // Role-specific redirect for superior UX:
      const userRole = body.user?.role;
      if (userRole === "FARM_OFFICER") {
        window.location.href = "/officer/day";
      } else if (userRole === "AGRONOMIST") {
        window.location.href = "/tasks";
      } else {
        window.location.href = "/dashboard";
      }
    } catch {
      setPending(false);
      setError("Network connectivity error. Please try again.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Quick Demo Switcher — Cohere capability cards, flat hairline, 8px */}
      <div style={{
        background: "var(--canvas)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-lg)", padding: 20,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: "var(--coral)" }} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.28, textTransform: "uppercase", color: "var(--slate-cohere)" }}>
            Select hierarchy persona
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
          {DEMO_ACCOUNTS.map((acc) => {
            const active = email === acc.email;
            return (
              <button
                key={acc.role}
                type="button"
                onClick={() => quickFill(acc.email, acc.password)}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 4,
                  padding: "12px 14px",
                  background: active ? "var(--cohere-primary)" : "var(--canvas)",
                  color: active ? "white" : "var(--ink)",
                  border: `1px solid ${active ? "var(--cohere-primary)" : "var(--hairline)"}`,
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer", textAlign: "left", transition: "all 150ms ease",
                  minWidth: 0,
                }}
              >
                <strong style={{ fontSize: 13, fontWeight: 500, color: active ? "white" : "var(--ink)", lineHeight: 1.2 }}>{acc.role}</strong>
                <small style={{ fontSize: 11, color: active ? "rgba(255,255,255,0.7)" : "var(--slate-cohere)", fontFamily: "var(--font-mono)" }}>{acc.badge}</small>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--slate-cohere)", fontFamily: "var(--font-mono)" }}>
          One tap fills credentials • no registration
        </div>
      </div>

      {/* Main Login Form */}
      <form onSubmit={submit} className="form">
        <div className="form-group">
          <label htmlFor="email-input">Email address</label>
          <input
            id="email-input"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@agaate.local"
            required
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label htmlFor="password-input">Password</label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary-700)",
                fontSize: "0.78rem",
                padding: 0,
                boxShadow: "none",
                cursor: "pointer",
              }}
            >
              {showPassword ? "Hide" : "Show password"}
            </button>
          </div>

          <input
            id="password-input"
            name="password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            required
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="error" role="alert">
            <Icons.AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || !email || !password}
          style={{ width: "100%", padding: "14px 20px" }}
        >
          {pending ? (
            <>
              <Icons.Zap size={18} />
              <span>Authenticating…</span>
            </>
          ) : (
            <>
              <Icons.ArrowRight size={18} />
              <span>Sign In to Agaate</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
