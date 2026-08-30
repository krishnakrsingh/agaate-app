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
    <div style={{ display: "grid", gap: 20 }}>
      {/* Quick Demo Switcher */}
      <div
        style={{
          background: "var(--slate-50)",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-lg)",
          padding: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <Icons.Sparkles size={14} style={{ color: "var(--harvest-amber)" }} />
          <span style={{ fontSize: "0.82rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.05em" }}>
            Select Hierarchy Persona to Test
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {DEMO_ACCOUNTS.map((acc) => (
            <button
              key={acc.role}
              type="button"
              onClick={() => quickFill(acc.email, acc.password)}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "10px 12px",
                background: email === acc.email ? "white" : "var(--slate-100)",
                border: `2px solid ${email === acc.email ? acc.color : "var(--border-subtle)"}`,
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s ease",
              }}
            >
              <strong style={{ fontSize: "0.88rem", color: "var(--text-main)" }}>{acc.role}</strong>
              <small style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{acc.badge}</small>
            </button>
          ))}
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
