"use client";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import type { TeamInput, ClientInput, FarmInput } from "./onboarding-schema";

function Field({
  label,
  error,
  required,
  children,
  helper,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  helper?: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            fontWeight: 600,
            color: "#1e293b",
            letterSpacing: "-0.01em",
          }}
        >
          <span>{label}</span>
          {required && <span style={{ color: "#dc2626", fontWeight: 700 }}>*</span>}
        </label>
        {helper}
      </div>
      {children}
      {error && (
        <div
          role="alert"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#dc2626",
            marginTop: 2,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Icons.AlertTriangle size={11} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  height: 38,
  fontSize: 13,
  fontWeight: 500,
  color: "#0f172a",
  backgroundColor: "#ffffff",
  border: "1px solid #d5ded7",
  borderRadius: 8,
  padding: "0 11px",
  boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
  outline: "none",
  width: "100%",
};

function generateSecurePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let pass = "";
  for (let i = 0; i < 12; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

export function OnboardingStepClientCredentials({
  value,
  onChange,
  client,
  farms,
  errors,
}: {
  value: TeamInput;
  onChange: (v: TeamInput) => void;
  client: ClientInput;
  farms: FarmInput[];
  errors: Record<string, string>;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Sync client profile details to credentials by default if empty
  useEffect(() => {
    if (!value.name && client.name) {
      onChange({
        ...value,
        mode: "create",
        name: client.name,
        email: client.email || value.email,
        phone: client.phone || value.phone,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.name, client.email, client.phone]);

  const patch = (p: Partial<TeamInput>) => onChange({ ...value, mode: "create", ...p });

  const handleGeneratePassword = () => {
    const p = generateSecurePassword();
    patch({ password: p, confirmPassword: p });
    setShowPassword(true);
  };

  const copyCredentials = () => {
    const txt = `Farm Admin Portal Login\nURL: /login\nUsername: ${value.email || client.email}\nPassword: ${value.password || ""}`;
    navigator.clipboard.writeText(txt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const passwordsMatch = Boolean(value.password && value.confirmPassword && value.password === value.confirmPassword);
  const e = (field: string) => errors[field] || errors[`team.${field}`];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* ── 2-COLUMN CREDENTIALS SETUP (ZERO SCROLL) ────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.1fr 0.9fr",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        {/* ── LEFT CARD: LOGIN ACCOUNT & PASSWORDS ───────────────────── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #d5e4d8",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(21, 128, 61, 0.04), 0 4px 12px rgba(21, 128, 61, 0.02)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 10,
              borderBottom: "1px solid #eef5ef",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: "#eaf5ec",
                  color: "#15803d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icons.Shield size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Client Login Credentials
                </h3>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0, marginTop: 1 }}>
                  Farm Admin account for portal authentication
                </p>
              </div>
            </div>

            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: "#f0fdf4",
                color: "#15803d",
                border: "1px solid #bbf7d0",
                padding: "3px 9px",
                borderRadius: 6,
                letterSpacing: "0.02em",
              }}
            >
              Role: Farm Admin
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {/* Account Name */}
            <div style={{ gridColumn: "1 / -1" }}>
              <Field label="Admin Account Name" error={e("name")} required>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Krishna Kumar Singh"
                  value={value.name || ""}
                  onChange={(ev) => patch({ name: ev.target.value })}
                  style={inputStyle}
                />
              </Field>
            </div>

            {/* Login Email */}
            <Field label="Login Email / Username" error={e("email")} required>
              <input
                type="email"
                className="input"
                placeholder="e.g., client@agaate.farm"
                value={value.email || ""}
                onChange={(ev) => patch({ email: ev.target.value })}
                style={inputStyle}
              />
            </Field>

            {/* Mobile / Phone */}
            <Field label="Mobile Number" error={e("phone")}>
              <input
                type="tel"
                className="input"
                placeholder="e.g., 9876543210"
                value={value.phone || ""}
                onChange={(ev) => patch({ phone: ev.target.value })}
                style={inputStyle}
              />
            </Field>

            {/* Password */}
            <Field
              label="Password"
              error={e("password")}
              required
              helper={
                <button
                  type="button"
                  onClick={handleGeneratePassword}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    fontSize: 11,
                    fontWeight: 600,
                    color: "#15803d",
                    cursor: "pointer",
                  }}
                >
                  Generate Strong
                </button>
              }
            >
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="input"
                  placeholder="Min 8 characters"
                  value={value.password || ""}
                  onChange={(ev) => patch({ password: ev.target.value })}
                  style={{
                    ...inputStyle,
                    paddingRight: 35,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 8,
                    top: 9,
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    cursor: "pointer",
                  }}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <Icons.EyeOff size={15} /> : <Icons.Eye size={15} />}
                </button>
              </div>
            </Field>

            {/* Confirm Password */}
            <Field label="Confirm Password" error={e("confirmPassword")} required>
              <input
                type={showPassword ? "text" : "password"}
                className="input"
                placeholder="Retype password"
                value={value.confirmPassword || ""}
                onChange={(ev) => patch({ confirmPassword: ev.target.value })}
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Quick Match & Copy Helper */}
          {value.password && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                borderRadius: 8,
                backgroundColor: passwordsMatch ? "#f0fdf4" : "#f8fafc",
                border: passwordsMatch ? "1px solid #bbf7d0" : "1px solid #e2e8f0",
                fontSize: 11.5,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {passwordsMatch ? (
                  <>
                    <Icons.Check size={13} style={{ color: "#15803d" }} />
                    <span style={{ color: "#15803d", fontWeight: 700 }}>Passwords match</span>
                  </>
                ) : (
                  <span style={{ color: "#64748b" }}>Passwords do not match yet</span>
                )}
              </div>

              <button
                type="button"
                onClick={copyCredentials}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  color: copied ? "#15803d" : "#0f172a",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <Icons.Copy size={12} />
                <span>{copied ? "Copied!" : "Copy Credentials"}</span>
              </button>
            </div>
          )}
        </div>

        {/* ── RIGHT CARD: ACCESS PRIVILEGES & PORTAL OVERVIEW ────────── */}
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #d5e4d8",
            borderRadius: 14,
            padding: "18px 20px",
            boxShadow: "0 1px 3px rgba(21, 128, 61, 0.04), 0 4px 12px rgba(21, 128, 61, 0.02)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            justifyContent: "space-between",
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                paddingBottom: 10,
                borderBottom: "1px solid #eef5ef",
              }}
            >
              <div
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  backgroundColor: "#eaf5ec",
                  color: "#15803d",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icons.Farm size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Assigned Estate Scope
                </h3>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0, marginTop: 1 }}>
                  Properties automatically assigned upon activation
                </p>
              </div>
            </div>

            {/* List of Farms Assigned to this Farm Admin */}
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                Governed Farms ({farms.length})
              </span>
              {farms.map((f, idx) => (
                <div
                  key={f.rowId ?? idx}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icons.Navigation size={13} style={{ color: "#15803d" }} />
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>
                      {f.name || `Farm ${idx + 1}`}
                    </span>
                  </div>
                  <span style={{ fontSize: 11.5, color: "#64748b" }}>
                    {f.area ? `${f.area} ${f.areaUnit || "Acres"}` : "Acreage pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Portal Sign-In Instructions Box */}
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              backgroundColor: "#f0fdf4",
              border: "1px solid #bbf7d0",
              display: "flex",
              flexDirection: "column",
              gap: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.CheckCircle size={15} style={{ color: "#15803d" }} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "#15803d" }}>
                Instant Activation
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: "#166534", lineHeight: 1.4 }}>
              Once you click <strong>Activate Client & Farm Admin</strong>, this user account will be created immediately with the <strong>FARM_ADMIN</strong> role and full control over their estate properties.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
