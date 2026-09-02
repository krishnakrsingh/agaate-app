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
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function performLogin(loginEmail: string, loginPass: string) {
    if (pending) return;
    setPending(true);
    setError("");
    setEmail(loginEmail);
    setPassword(loginPass);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), password: loginPass }),
      });

      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        setPending(false);
        setError(body.error ?? "Unable to sign in. Please verify your credentials.");
        return;
      }

      const userRole = body.user?.role;
      let targetUrl = "/dashboard";
      if (userRole === "FARM_OFFICER") {
        targetUrl = "/officer/day";
      } else if (userRole === "AGRONOMIST") {
        targetUrl = "/tasks";
      }
      // Instant browser redirect to target console
      window.location.replace(targetUrl);
    } catch {
      setPending(false);
      setError("Network connectivity error. Please try again.");
    }
  }

  function handleQuickFill(accEmail: string, accPass: string) {
    setEmail(accEmail);
    setPassword(accPass);
    setError("");
    void performLogin(accEmail, accPass);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performLogin(email, password);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%" }}>
      {/* 1-Click Demo Persona Selector */}
      <div
        className="compact-card"
        style={{
          padding: 16,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
            <span className="mono-label" style={{ color: "var(--ink)", fontWeight: 650 }}>
              QUICK DEMO PERSONAS
            </span>
          </div>
          <span className="muted" style={{ fontSize: "11px" }}>Tap to autofill &amp; sign in</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          {DEMO_ACCOUNTS.map((acc) => {
            const isSelected = email === acc.email;
            return (
              <div
                key={acc.email}
                onClick={() => handleQuickFill(acc.email, acc.password)}
                style={{
                  background: isSelected ? "var(--green-light)" : "var(--stone)",
                  border: `1px solid ${isSelected ? "var(--green)" : "var(--line)"}`,
                  borderRadius: "var(--radius-xs)",
                  padding: "10px 12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "13px", color: isSelected ? "var(--green-dark)" : "var(--ink)" }}>
                    {acc.role}
                  </strong>
                  {isSelected && <Icons.CheckCircle size={14} style={{ color: "var(--green)" }} />}
                </div>
                <div className="muted" style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }}>
                  {acc.email}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void performLogin(acc.email, acc.password);
                  }}
                  className="btn btn-secondary btn-sm"
                  disabled={pending}
                  style={{
                    fontSize: "11px",
                    padding: "3px 8px",
                    minHeight: "auto",
                    justifyContent: "center",
                    marginTop: 2,
                    background: isSelected ? "var(--green)" : "var(--canvas)",
                    color: isSelected ? "#fff" : "var(--ink)",
                    borderColor: isSelected ? "var(--green)" : "var(--line)",
                  }}
                >
                  <Icons.Zap size={11} />
                  <span>{pending && isSelected ? "Signing in…" : "Sign In →"}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="compact-card" style={{ padding: 24, gap: 16 }}>
        <div>
          <h2 className="section-title" style={{ margin: "0 0 2px" }}>Sign in to Agaate</h2>
          <p className="muted" style={{ margin: 0, fontSize: "12px" }}>
            Enter credentials or select a persona above. Default password: <code className="data" style={{ fontSize: "11px" }}>LocalAdminPassword-ChangeMe-123</code>
          </p>
        </div>

        {error && (
          <div className="error" role="alert">
            <Icons.AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="login-email">Email Address</label>
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
                className="btn btn-link"
                style={{ fontSize: "12px", padding: 0 }}
              >
                {showPassword ? "Hide" : "Show"}
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
            className="btn btn-green btn-lg"
            disabled={pending || !email || !password}
            style={{ width: "100%", marginTop: 4 }}
          >
            <span>{pending ? "Authenticating & Redirecting…" : "Sign In to Console"}</span>
            <Icons.ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
