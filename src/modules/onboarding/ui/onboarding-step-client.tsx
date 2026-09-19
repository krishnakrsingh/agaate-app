"use client";
import { useEffect, useRef, useState } from "react";
import { previewClientCode, type ClientInput } from "./onboarding-schema";
import { Icons } from "@/components/icons";

function Field({
  label,
  error,
  required,
  span,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  span?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 5,
        gridColumn: span ? "1 / -1" : undefined,
      }}
    >
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 3,
          fontSize: 12,
          fontWeight: 600,
          color: "var(--ink, #0f172a)",
          letterSpacing: "-0.01em",
        }}
      >
        <span>{label}</span>
        {required && <span style={{ color: "var(--semantic-error, #dc2626)", fontWeight: 700 }}>*</span>}
      </label>
      {children}
      {error && (
        <div
          role="alert"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--semantic-error, #dc2626)",
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

export function OnboardingStepClient({
  value,
  onChange,
  errors,
  idempotencyKey,
  asyncIssue,
  onAsyncIssue,
  existingClientId,
}: {
  value: ClientInput;
  onChange: (v: ClientInput) => void;
  errors: Record<string, string>;
  idempotencyKey: string;
  asyncIssue: string | null;
  onAsyncIssue: (msg: string | null) => void;
  existingClientId?: string;
}) {
  const set = (p: Partial<ClientInput>) => onChange({ ...value, ...p });
  const [checking, setChecking] = useState(false);
  const lastQ = useRef("");

  useEffect(() => {
    const phone = (value.phone ?? "").trim();
    const email = (value.email ?? "").trim();
    if (!phone && !email) {
      onAsyncIssue(null);
      return;
    }
    const q = `${phone}::${email}::${existingClientId ?? ""}`;
    lastQ.current = q;
    const t = setTimeout(async () => {
      if (q === lastQ.current) setChecking(true);
      try {
        const params = new URLSearchParams();
        if (phone) params.set("phone", phone);
        if (email) params.set("email", email);
        if (existingClientId) params.set("clientId", existingClientId);
        const res = await fetch(`/api/hq/onboarding/check-unique?${params.toString()}`);
        if (q !== lastQ.current) return;
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          onAsyncIssue(body.error ?? "Could not verify phone/email. Try again.");
          return;
        }
        const issues: string[] = [];
        if (body.phoneTaken) {
          issues.push(`Phone ${body.phoneHolder ? `already in use by ${body.phoneHolder}` : "already in use"}.`);
        }
        if (body.emailTaken) {
          issues.push(`Email ${body.emailHolder ? `already in use by ${body.emailHolder}` : "already in use"}.`);
        }
        onAsyncIssue(issues.length ? issues.join(" ") : null);
      } catch {
        if (q === lastQ.current) onAsyncIssue(null);
      } finally {
        if (q === lastQ.current) setChecking(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [value.phone, value.email, existingClientId, onAsyncIssue]);

  const isSameAsMobile = Boolean(value.phone && value.whatsappNo === value.phone);

  const toggleSameAsMobile = () => {
    if (isSameAsMobile) {
      set({ whatsappNo: "" });
    } else {
      set({ whatsappNo: value.phone ?? "" });
    }
  };

  const addressSummary = [value.village, value.city, value.state, value.pincode].filter(Boolean).join(", ");
  const isSameAsAddress = Boolean(value.billingAddress && addressSummary && value.billingAddress === addressSummary);

  const toggleSameAsAddress = () => {
    if (isSameAsAddress) {
      set({ billingAddress: "" });
    } else {
      set({ billingAddress: addressSummary || [value.city, value.state].filter(Boolean).join(", ") });
    }
  };

  const isSameAsClient = Boolean(
    value.name &&
    value.phone &&
    value.localConnectName === value.name &&
    value.localConnectPhone === value.phone
  );

  const toggleSameAsClient = () => {
    if (isSameAsClient) {
      set({ localConnectName: "", localConnectPhone: "", localConnectSameAsClient: false });
    } else {
      set({
        localConnectName: value.name || "",
        localConnectPhone: value.phone || "",
        localConnectSameAsClient: true,
      });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Existing Client Alert Banner if prefilled */}
      {existingClientId && (
        <div
          style={{
            background: "var(--surface-card, #ffffff)",
            border: "1px solid var(--hairline, #e8ede9)",
            borderLeft: "4px solid var(--primary, #15803d)",
            borderRadius: "var(--radius-lg, 12px)",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12.5,
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icons.User size={15} style={{ color: "var(--primary, #15803d)" }} />
            <span style={{ color: "var(--ink, #0f172a)" }}>
              Onboarding existing client: <strong>{value.name || existingClientId}</strong>
            </span>
          </div>
          <span style={{ fontSize: 11, color: "var(--muted, #64748b)" }}>Profile synced</span>
        </div>
      )}

      {/* Real-time Uniqueness Conflict Warning */}
      {asyncIssue && (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: "var(--radius-lg, 12px)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "#b91c1c",
            fontWeight: 600,
          }}
        >
          <Icons.AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{asyncIssue}</span>
        </div>
      )}

      {/* ── UNIFIED CARD: STYLED AFTER CLIENT DIRECTORY TABLE AESTHETIC ── */}
      <div
        style={{
          background: "var(--surface-card, #ffffff)",
          border: "1px solid var(--hairline, #e8ede9)",
          borderRadius: "var(--radius-xl, 16px)",
          boxShadow: "var(--shadow-subtle, 0 1px 3px rgba(12, 10, 9, 0.03))",
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 32,
          padding: "24px 28px",
        }}
      >
        {/* ── LEFT COLUMN: CLIENT IDENTITY & PRIMARY CONTACT ───────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Column Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 10,
              borderBottom: "1px solid var(--hairline-soft, #f2f5f2)",
              marginBottom: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "var(--primary, #15803d)",
                  flexShrink: 0,
                }}
              />
              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--ink, #0f172a)",
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Client Profile &amp; Contact
              </h3>
            </div>

            <span
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 600,
                color: "var(--muted, #64748b)",
                background: "var(--canvas-floor, #fafbfa)",
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid var(--hairline, #e8ede9)",
                letterSpacing: "0.02em",
              }}
            >
              ID: {previewClientCode(idempotencyKey)}
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {/* Full Name */}
            <Field label="Full Name" error={errors["name"] || errors["client.name"]} required span>
              <input
                type="text"
                className="onboarding-form-input"
                placeholder="e.g., Krishna Kumar Singh"
                value={value.name}
                onChange={(e) => set({ name: e.target.value })}
                autoFocus
              />
            </Field>

            {/* Email Address */}
            <Field label="Email Address" error={errors["email"] || errors["client.email"]} required span>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  className="onboarding-form-input"
                  placeholder="e.g., krishna@agaate.farm"
                  value={value.email}
                  onChange={(e) => set({ email: e.target.value })}
                  style={{
                    paddingRight: checking ? 36 : 12,
                  }}
                />
                {checking && (
                  <div style={{ position: "absolute", right: 12, top: 11, color: "var(--muted, #64748b)" }}>
                    <Icons.Refresh size={14} className="spin" />
                  </div>
                )}
              </div>
            </Field>

            {/* Mobile Number */}
            <Field label="Mobile Number" error={errors["phone"] || errors["client.phone"]} required>
              <input
                type="tel"
                className="onboarding-form-input"
                placeholder="e.g., 9876543210"
                value={value.phone}
                onChange={(e) => {
                  const val = e.target.value;
                  set({
                    phone: val,
                    ...(isSameAsMobile ? { whatsappNo: val } : {}),
                  });
                }}
              />
            </Field>

            {/* WhatsApp Number with [✓] Same as mobile toggle */}
            <Field label="WhatsApp Number" error={errors["whatsappNo"] || errors["client.whatsappNo"]}>
              <div style={{ position: "relative" }}>
                <input
                  type="tel"
                  className="onboarding-form-input"
                  placeholder="e.g., 9876543210"
                  value={value.whatsappNo || ""}
                  onChange={(e) => set({ whatsappNo: e.target.value })}
                  disabled={isSameAsMobile}
                  style={{
                    paddingRight: 118,
                  }}
                />
                <button
                  type="button"
                  onClick={toggleSameAsMobile}
                  disabled={!value.phone?.trim()}
                  style={{
                    position: "absolute",
                    right: 5,
                    top: 5,
                    height: 28,
                    padding: "0 9px",
                    fontSize: 11,
                    fontWeight: isSameAsMobile ? 600 : 500,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    border: isSameAsMobile
                      ? "1px solid rgba(21, 128, 61, 0.28)"
                      : "1px solid var(--hairline, #e8ede9)",
                    backgroundColor: isSameAsMobile
                      ? "var(--green-tint, #eaf5ec)"
                      : "var(--canvas-floor, #fafbfa)",
                    color: isSameAsMobile
                      ? "var(--green-ink, #14532d)"
                      : "var(--muted, #64748b)",
                    cursor: value.phone?.trim() ? "pointer" : "not-allowed",
                    transition: "all 0.15s ease",
                  }}
                  title="Link mobile number to WhatsApp"
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      border: isSameAsMobile
                        ? "1px solid var(--primary, #15803d)"
                        : "1.5px solid var(--hairline-strong, #d2ded4)",
                      backgroundColor: isSameAsMobile ? "var(--primary, #15803d)" : "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isSameAsMobile && <Icons.Check size={8} strokeWidth={3} style={{ color: "#ffffff" }} />}
                  </div>
                  <span>Same as mob</span>
                </button>
              </div>
            </Field>

            {/* Business / Company Name */}
            <Field label="Business Name" error={errors["companyName"] || errors["client.companyName"]}>
              <input
                type="text"
                className="onboarding-form-input"
                placeholder="e.g., Greenfield Agro Pvt Ltd (Optional)"
                value={value.companyName || ""}
                onChange={(e) => set({ companyName: e.target.value })}
              />
            </Field>

            {/* GST (GSTIN) */}
            <Field label="GST (GSTIN)" error={errors["gstin"] || errors["client.gstin"]}>
              <input
                type="text"
                className="onboarding-form-input"
                placeholder="e.g., 29ABCDE1234F1Z5 (Optional)"
                value={value.gstin || ""}
                onChange={(e) => set({ gstin: e.target.value.toUpperCase() })}
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                }}
              />
            </Field>
          </div>
        </div>

        {/* ── RIGHT COLUMN: ADDRESS, BILLING & FIELD OPS ──────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
            borderLeft: "1px solid var(--hairline, #e8ede9)",
            paddingLeft: 32,
          }}
        >
          {/* Column Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingBottom: 10,
              borderBottom: "1px solid var(--hairline-soft, #f2f5f2)",
              marginBottom: 4,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: "var(--blue, #315f86)",
                  flexShrink: 0,
                }}
              />
              <h3
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--ink, #0f172a)",
                  margin: 0,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Address, Billing &amp; Field Ops
              </h3>
            </div>

            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--blue, #315f86)",
                background: "var(--blue-light, #eaf0f5)",
                padding: "3px 8px",
                borderRadius: 6,
                border: "1px solid rgba(49, 95, 134, 0.16)",
                letterSpacing: "0.02em",
              }}
            >
              Tax &amp; Invoicing
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {/* Village */}
            <Field label="Village / Street" error={errors["village"] || errors["client.village"]} required>
              <input
                type="text"
                className="onboarding-form-input"
                placeholder="e.g., Solur"
                value={value.village || ""}
                onChange={(e) => set({ village: e.target.value })}
                style={{
                  fontSize: 12.5,
                  padding: "0 10px",
                }}
              />
            </Field>

            {/* City */}
            <Field label="City / Taluk" error={errors["city"] || errors["client.city"]} required>
              <input
                type="text"
                className="onboarding-form-input"
                placeholder="e.g., Magadi"
                value={value.city || ""}
                onChange={(e) => set({ city: e.target.value })}
                style={{
                  fontSize: 12.5,
                  padding: "0 10px",
                }}
              />
            </Field>

            {/* State */}
            <Field label="State" error={errors["state"] || errors["client.state"]} required>
              <input
                type="text"
                className="onboarding-form-input"
                placeholder="e.g., Karnataka"
                value={value.state || ""}
                onChange={(e) => set({ state: e.target.value })}
                style={{
                  fontSize: 12.5,
                  padding: "0 10px",
                }}
              />
            </Field>

            {/* PIN Code */}
            <Field label="PIN Code" error={errors["pincode"] || errors["client.pincode"]} required>
              <input
                type="text"
                className="onboarding-form-input"
                placeholder="e.g., 562127"
                maxLength={6}
                value={value.pincode || ""}
                onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "") })}
                style={{
                  fontSize: 12.5,
                  fontFamily: "var(--font-mono, monospace)",
                  padding: "0 10px",
                }}
              />
            </Field>

            {/* Billing Location / Address with [✓] Same as Address toggle */}
            <Field
              label="Billing Location / Address"
              error={errors["billingAddress"] || errors["client.billingAddress"]}
              required
              span
            >
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  className="onboarding-form-input"
                  placeholder="e.g., 45 Greenfield Agri Tech Park, Hoskote, Bengaluru Rural"
                  value={value.billingAddress || ""}
                  onChange={(e) => set({ billingAddress: e.target.value })}
                  style={{
                    paddingRight: 142,
                  }}
                />
                <button
                  type="button"
                  onClick={toggleSameAsAddress}
                  disabled={!addressSummary}
                  style={{
                    position: "absolute",
                    right: 5,
                    top: 5,
                    height: 28,
                    padding: "0 9px",
                    fontSize: 11,
                    fontWeight: isSameAsAddress ? 600 : 500,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    border: isSameAsAddress
                      ? "1px solid rgba(21, 128, 61, 0.28)"
                      : "1px solid var(--hairline, #e8ede9)",
                    backgroundColor: isSameAsAddress
                      ? "var(--green-tint, #eaf5ec)"
                      : "var(--canvas-floor, #fafbfa)",
                    color: isSameAsAddress
                      ? "var(--green-ink, #14532d)"
                      : "var(--muted, #64748b)",
                    cursor: addressSummary ? "pointer" : "not-allowed",
                    transition: "all 0.15s ease",
                  }}
                  title="Copy physical address to billing location"
                >
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      border: isSameAsAddress
                        ? "1px solid var(--primary, #15803d)"
                        : "1.5px solid var(--hairline-strong, #d2ded4)",
                      backgroundColor: isSameAsAddress ? "var(--primary, #15803d)" : "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isSameAsAddress && <Icons.Check size={8} strokeWidth={3} style={{ color: "#ffffff" }} />}
                  </div>
                  <span>Same as address</span>
                </button>
              </div>
            </Field>

            {/* ── SUBSECTION: ON-GROUND LOCAL CONNECT ── */}
            <div
              style={{
                gridColumn: "1 / -1",
                paddingTop: 10,
                marginTop: 2,
                borderTop: "1px solid var(--hairline-soft, #f2f5f2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    backgroundColor: "var(--green-tint, #eaf5ec)",
                    color: "var(--primary, #15803d)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icons.Users size={12} />
                </div>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink, #0f172a)" }}>
                    On-Ground Local Connect
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted, #64748b)", marginLeft: 6 }}>
                    (Field Ops &amp; Demarcation)
                  </span>
                </div>
              </div>

              {/* Same as Client Toggle */}
              <button
                type="button"
                onClick={toggleSameAsClient}
                disabled={!value.name || !value.phone}
                style={{
                  height: 26,
                  padding: "0 8px",
                  fontSize: 11,
                  fontWeight: isSameAsClient ? 600 : 500,
                  borderRadius: 6,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  border: isSameAsClient
                    ? "1px solid rgba(21, 128, 61, 0.28)"
                    : "1px solid var(--hairline, #e8ede9)",
                  backgroundColor: isSameAsClient
                    ? "var(--green-tint, #eaf5ec)"
                    : "var(--canvas-floor, #fafbfa)",
                  color: isSameAsClient
                    ? "var(--green-ink, #14532d)"
                    : "var(--muted, #64748b)",
                  cursor: value.name && value.phone ? "pointer" : "not-allowed",
                  transition: "all 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                title="Copy primary client contact as local connect"
              >
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    border: isSameAsClient
                      ? "1px solid var(--primary, #15803d)"
                      : "1.5px solid var(--hairline-strong, #d2ded4)",
                    backgroundColor: isSameAsClient ? "var(--primary, #15803d)" : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  {isSameAsClient && <Icons.Check size={8} strokeWidth={3} style={{ color: "#ffffff" }} />}
                </div>
                <span>Same as client</span>
              </button>
            </div>

            {/* Local Connect Name (span 2 of 4) */}
            <div style={{ gridColumn: "span 2" }}>
              <Field label="Local Connect Full Name" error={errors["localConnectName"] || errors["client.localConnectName"]}>
                <input
                  type="text"
                  className="onboarding-form-input"
                  placeholder="e.g., Ramesh Patel"
                  value={value.localConnectName || ""}
                  onChange={(e) => set({ localConnectName: e.target.value })}
                  style={{
                    fontSize: 12.5,
                    padding: "0 10px",
                  }}
                />
              </Field>
            </div>

            {/* Local Connect Mobile (span 2 of 4) */}
            <div style={{ gridColumn: "span 2" }}>
              <Field label="Mobile Number" error={errors["localConnectPhone"] || errors["client.localConnectPhone"]}>
                <input
                  type="tel"
                  className="onboarding-form-input"
                  placeholder="e.g., 9876543210"
                  value={value.localConnectPhone || ""}
                  onChange={(e) => set({ localConnectPhone: e.target.value })}
                  style={{
                    fontSize: 12.5,
                    padding: "0 10px",
                  }}
                />
              </Field>
            </div>

            <p style={{ gridColumn: "1 / -1", fontSize: 11, color: "var(--muted, #64748b)", margin: 0 }}>
              Primary field representative for farm surveys, boundaries, and plot demarcation (appears in team roster).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

