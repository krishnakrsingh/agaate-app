"use client";
import { FormEvent, useState } from "react";
import { Icons } from "./icons";

const DEMO_ACCOUNTS = [
  {
    role: "Super Admin",
    badge: "Global Director",
    email: "admin@agaate.local",
    password: "LocalAdminPassword-ChangeMe-123",
  },
  {
    role: "Farm Admin",
    badge: "Operations Manager",
    email: "farmadmin@agaate.local",
    password: "LocalAdminPassword-ChangeMe-123",
  },
  {
    role: "Agronomist",
    badge: "Central Agronomy",
    email: "agronomist@agaate.local",
    password: "LocalAdminPassword-ChangeMe-123",
  },
  {
    role: "Farm Officer",
    badge: "Field Execution",
    email: "officer@agaate.local",
    password: "LocalAdminPassword-ChangeMe-123",
  },
];

export function LoginForm() {
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
    <div style={{ display: "grid", gap: 20, width: "100%" }}>
      {/* Demo Account Persona Selector */}
      <div
        style={{
          background: "var(--soft-stone)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-sm)",
          padding: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--coral)" }} />
          <span className="mono-label" style={{ color: "var(--ink)" }}>
            Select Persona to Test
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
          {DEMO_ACCOUNTS.map((acc) => {
            const isSelected = email === acc.email;
            return (
              <button
                key={acc.email}
                type="button"
                onClick={() => quickFill(acc.email, acc.password)}
                style={{
                  background: isSelected ? "var(--primary)" : "var(--canvas)",
                  color: isSelected ? "var(--on-primary)" : "var(--ink)",
                  border: `1px solid ${isSelected ? "var(--primary)" : "var(--hairline)"}`,
                  borderRadius: "var(--radius-xs)",
                  padding: "8px 10px",
                  textAlign: "left",
                  cursor: "pointer",
                  transition: "all var(--transition-fast)",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600 }}>{acc.role}</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>{acc.badge}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="card" style={{ padding: 28 }}>
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ margin: "0 0 4px", fontSize: 24 }}>Sign in to Agaate</h2>
          <p style={{ margin: 0, fontSize: 14, color: "var(--body-muted)" }}>
            Enter your credentials to access precision agriculture operations.
          </p>
        </div>

        {error && (
          <div className="error" role="alert">
            <Icons.AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} style={{ display: "grid", gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="e.g., admin@agaate.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label htmlFor="login-password" style={{ margin: 0 }}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn btn-ghost"
                style={{ fontSize: 12, padding: 0 }}
              >
                {showPassword ? "Hide password" : "Show password"}
              </button>
            </div>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Enter account password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={pending || !email || !password}
            style={{ width: "100%", marginTop: 8 }}
          >
            <span>{pending ? "Authenticating…" : "Sign In to Console"}</span>
            <Icons.ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
