"use client";
import { FormEvent, useState } from "react";
import { Icons } from "./icons";
import { BrandLogo } from "./brand-logo";

interface TestProfile {
  role: string;
  roleLabel: string;
  badge: string;
  name: string;
  title: string;
  email: string;
  target: string;
  icon: typeof Icons.Shield;
  badgeBg: string;
  badgeColor: string;
  accent: string;
}

const TEST_PROFILES: TestProfile[] = [
  {
    role: "SUPER_ADMIN",
    roleLabel: "Super Admin",
    badge: "Super Admin",
    name: "Arjun Singhania",
    title: "Global Operations & System Config",
    email: "admin@agaate.local",
    target: "/dashboard",
    icon: Icons.Shield,
    badgeBg: "var(--stone)",
    badgeColor: "var(--ink)",
    accent: "var(--green)",
  },
  {
    role: "FARM_ADMIN",
    roleLabel: "Farm Admin",
    badge: "Estate Owner",
    name: "Vikram Mehta",
    title: "Estates, Plots & Workers Cockpit",
    email: "farmadmin@agaate.local",
    target: "/owner/dashboard",
    icon: Icons.Farm,
    badgeBg: "var(--amber-light)",
    badgeColor: "var(--amber)",
    accent: "var(--amber)",
  },
  {
    role: "AGRONOMIST",
    roleLabel: "Agronomist",
    badge: "Agronomist",
    name: "Dr. Ananya Rao",
    title: "Agronomy Radar & Prescriptions",
    email: "agronomist@agaate.local",
    target: "/agronomy/radar",
    icon: Icons.Leaf,
    badgeBg: "var(--green-light)",
    badgeColor: "var(--green)",
    accent: "var(--green)",
  },
  {
    role: "FARM_OFFICER",
    roleLabel: "Field Officer",
    badge: "Field Officer",
    name: "Ramesh Patel",
    title: "Daily Tasks & Attendance GPS",
    email: "officer@agaate.local",
    target: "/officer/day",
    icon: Icons.User,
    badgeBg: "var(--blue-light)",
    badgeColor: "var(--blue)",
    accent: "var(--blue)",
  },
];

const ALTERNATIVE_OFFICERS = [
  { name: "Suresh Kumar", region: "Mandya", email: "officer2@agaate.local" },
  { name: "Pooja Deshmukh", region: "Nashik", email: "officer3@agaate.local" },
];

const TEST_PASSWORD = "LocalAdminPassword-ChangeMe-123";

export function LoginForm() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [activeQuickEmail, setActiveQuickEmail] = useState<string | null>(null);
  const [copiedPass, setCopiedPass] = useState(false);

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
        setActiveQuickEmail(null);
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
      setActiveQuickEmail(null);
      setError("Network connectivity error. Please check your connection and try again.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await performLogin(identifier, password);
  }

  async function handleQuickLogin(email: string) {
    if (pending) return;
    setActiveQuickEmail(email);
    setIdentifier(email);
    setPassword(TEST_PASSWORD);
    await performLogin(email, TEST_PASSWORD);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, width: "100%", margin: "0 auto" }}>
      <div className="compact-card" style={{ padding: "28px 24px", gap: 20, boxShadow: "var(--shadow-card)", borderRadius: "var(--radius-md)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <BrandLogo height={26} />
            <div className="eyebrow" style={{ margin: 0 }}>
              <span className="eyebrow-dot" />
              <span>ACCESS PORTAL</span>
            </div>
          </div>
          <h2 className="section-title" style={{ margin: "0 0 4px", fontSize: "19px" }}>Sign in to your account</h2>
          <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
            Precision farm operations and agronomy management.
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
            style={{ width: "100%", marginTop: 4 }}
          >
            <span>{pending ? "Authenticating…" : "Sign In to Operations"}</span>
            {pending ? (
              <Icons.Spinner className="spin" size={15} />
            ) : (
              <Icons.ArrowRight size={15} />
            )}
          </button>
        </form>

        {/* Quick 1-Click Sign-In for 4 Persons of Authority (Testing Phase) */}
        <div style={{
          marginTop: 14,
          paddingTop: 18,
          borderTop: "1px dashed var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.Zap size={14} style={{ color: "var(--amber)" }} />
              <span className="mono-label" style={{ fontSize: "11px", letterSpacing: "0.06em", color: "var(--ink)", fontWeight: 700 }}>
                QUICK SIGN-IN: 4 PERSONS OF AUTHORITY
              </span>
            </div>
            <span style={{
              fontSize: "9.5px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "var(--green)",
              background: "var(--green-light)",
              border: "1px solid rgba(36, 84, 58, 0.2)",
              padding: "2px 6px",
              borderRadius: "3px",
              textTransform: "uppercase",
            }}>
              Testing Phase
            </span>
          </div>

          <p className="muted" style={{ margin: 0, fontSize: "11.5px", lineHeight: 1.4 }}>
            Click any authority persona below to immediately authenticate into their role desk.
          </p>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: 8,
          }}>
            {TEST_PROFILES.map((profile) => {
              const Icon = profile.icon;
              const isThisActive = pending && activeQuickEmail === profile.email;
              return (
                <button
                  key={profile.role}
                  type="button"
                  disabled={pending}
                  onClick={() => handleQuickLogin(profile.email)}
                  title={`1-Click Sign In as ${profile.roleLabel} (${profile.email})`}
                  style={{
                    textAlign: "left",
                    background: isThisActive ? "var(--green-light)" : "var(--canvas)",
                    border: `1px solid ${isThisActive ? "var(--green)" : "var(--line)"}`,
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    transition: "all 0.15s ease",
                    cursor: pending ? "not-allowed" : "pointer",
                    opacity: pending && !isThisActive ? 0.5 : 1,
                  }}
                  className="hover-glow"
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <span
                      style={{
                        fontSize: "9.5px",
                        fontWeight: 700,
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        padding: "2px 6px",
                        borderRadius: "3px",
                        background: profile.badgeBg,
                        color: profile.badgeColor,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Icon size={11} />
                      {profile.badge}
                    </span>
                    <span className="mono-label" style={{ fontSize: "9px", color: "var(--muted)" }}>
                      {profile.target.replace("/", "")}
                    </span>
                  </div>

                  <div>
                    <div style={{ fontSize: "12.5px", fontWeight: 650, color: "var(--ink)", lineHeight: 1.25 }}>
                      {profile.name}
                    </div>
                    <div className="muted" style={{ fontSize: "10.5px", marginTop: 2, lineHeight: 1.2 }}>
                      {profile.title}
                    </div>
                  </div>

                  <div style={{
                    marginTop: 2,
                    paddingTop: 6,
                    borderTop: "1px solid var(--line)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    fontSize: "10.5px",
                  }}>
                    <span className="mono-label" style={{ color: "var(--muted)", fontSize: "9.5px" }}>
                      {profile.email.split("@")[0]}
                    </span>
                    <span style={{
                      fontWeight: 650,
                      color: isThisActive ? "var(--green-dark)" : "var(--green)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                    }}>
                      {isThisActive ? (
                        <>
                          <Icons.Spinner className="spin" size={11} />
                          <span>Signing in…</span>
                        </>
                      ) : (
                        <>
                          <span>1-Click Sign In</span>
                          <Icons.ArrowRight size={10} />
                        </>
                      )}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Test credentials info pill */}
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 6,
            fontSize: "10.5px",
            padding: "6px 10px",
            background: "var(--stone)",
            borderRadius: "var(--radius-xs)",
            border: "1px solid var(--stone)",
          }}>
            <span style={{ color: "var(--muted)" }}>
              Test Password: <strong style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}>{TEST_PASSWORD}</strong>
            </span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(TEST_PASSWORD);
                setCopiedPass(true);
                setTimeout(() => setCopiedPass(false), 2000);
              }}
              className="btn btn-link"
              style={{ fontSize: "10.5px", padding: 0, display: "inline-flex", alignItems: "center", gap: 3, color: "var(--green)" }}
            >
              <Icons.Copy size={11} />
              <span>{copiedPass ? "Copied!" : "Copy Password"}</span>
            </button>
          </div>

          {/* Regional Field Officers */}
          <div style={{
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 6,
            fontSize: "10.5px",
            padding: "6px 10px",
            background: "var(--stone)",
            borderRadius: "var(--radius-xs)",
            border: "1px solid var(--stone)",
            color: "var(--muted)",
          }}>
            <span style={{ fontWeight: 600, color: "var(--ink)" }}>Regional Officers:</span>
            {ALTERNATIVE_OFFICERS.map((alt) => {
              const isThisAltActive = pending && activeQuickEmail === alt.email;
              return (
                <button
                  key={alt.email}
                  type="button"
                  onClick={() => handleQuickLogin(alt.email)}
                  disabled={pending}
                  className="btn btn-link hover-glow"
                  style={{
                    fontSize: "10.5px",
                    padding: "2px 8px",
                    background: isThisAltActive ? "var(--green-light)" : "var(--canvas)",
                    border: `1px solid ${isThisAltActive ? "var(--green)" : "var(--line)"}`,
                    borderRadius: "3px",
                    color: "var(--blue)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                  title={`1-Click Sign In as ${alt.name} (${alt.email})`}
                >
                  {isThisAltActive ? (
                    <>
                      <Icons.Spinner className="spin" size={10} />
                      <span>{alt.name.split(" ")[0]}…</span>
                    </>
                  ) : (
                    <span>{alt.name.split(" ")[0]} ({alt.region}) &rarr;</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

