"use client";
import { FormEvent, useState } from "react";
import { Icons } from "./icons";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
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
      if (userRole === "FARM_ADMIN") {
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performLogin(identifier, password);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", maxWidth: 440, margin: "0 auto" }}>
      <div className="compact-card" style={{ padding: 28, gap: 20, boxShadow: "var(--shadow-card)", borderRadius: "var(--radius-md)" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>
            <span className="eyebrow-dot" />
            <span>AUTHENTICATED ACCESS</span>
          </div>
          <h2 className="section-title" style={{ margin: "0 0 4px", fontSize: "20px" }}>Sign in to Agaate</h2>
          <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
            Precision farm operations and management portal.
          </p>
        </div>

        {error && (
          <div className="error" role="alert">
            <Icons.AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label htmlFor="login-identifier" style={{ fontSize: "13px", fontWeight: 600 }}>Mobile Number or Email</label>
            <input
              id="login-identifier"
              type="text"
              required
              autoFocus
              autoComplete="username"
              placeholder="e.g. 9876543210 or name@agaate.ag"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={pending}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <label htmlFor="login-password" style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="btn btn-link"
                style={{ fontSize: "12px", padding: 0 }}
                tabIndex={-1}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={pending}
            />
          </div>

          <button
            type="submit"
            className="btn btn-green btn-lg"
            disabled={pending || !identifier || !password}
            style={{ width: "100%", marginTop: 6 }}
          >
            <span>{pending ? "Authenticating…" : "Sign In to Operations"}</span>
            <Icons.ArrowRight size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
