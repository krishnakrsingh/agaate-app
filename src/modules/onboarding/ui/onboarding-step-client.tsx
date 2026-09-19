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
        gap: 4,
        gridColumn: span ? "1 / -1" : undefined,
      }}
    >
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Existing Client Alert Banner if prefilled */}
      {existingClientId && (
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #d5e4d8",
            borderLeft: "4px solid #15803d",
            borderRadius: 10,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12.5,
            boxShadow: "0 1px 3px rgba(21, 128, 61, 0.04)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icons.User size={15} style={{ color: "#15803d" }} />
            <span style={{ color: "#0f172a" }}>
              Onboarding existing client: <strong>{value.name || existingClientId}</strong>
            </span>
          </div>
          <span style={{ fontSize: 11, color: "#64748b" }}>Profile synced</span>
        </div>
      )}

      {/* Real-time Uniqueness Conflict Warning */}
      {asyncIssue && (
        <div
          role="alert"
          style={{
            background: "#fef2f2",
            border: "1px solid #fecaca",
            borderRadius: 10,
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

      {/* ── 2-COLUMN UNIFIED SPLIT (ZERO-SCROLL) ───────────────────────── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        {/* ── LEFT CARD: CLIENT IDENTITY & PRIMARY CONTACT ───────────── */}
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
                <Icons.User size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Client Profile & Contact
                </h3>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0, marginTop: 1 }}>
                  Legal owner and primary representative
                </p>
              </div>
            </div>

            <div
              style={{
                fontSize: 11,
                fontFamily: "var(--font-mono, monospace)",
                fontWeight: 600,
                color: "#64748b",
                background: "#f1f5f9",
                padding: "3px 8px",
                borderRadius: 5,
                border: "1px solid #e2e8f0",
              }}
            >
              ID: {previewClientCode(idempotencyKey)}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
            }}
          >
            {/* Full Name */}
            <Field label="Full Name" error={errors["name"] || errors["client.name"]} required span>
              <input
                type="text"
                className="input"
                placeholder="e.g., Krishna Kumar Singh"
                value={value.name}
                onChange={(e) => set({ name: e.target.value })}
                autoFocus
                style={inputStyle}
              />
            </Field>

            {/* Email Address */}
            <Field label="Email Address" error={errors["email"] || errors["client.email"]} required span>
              <div style={{ position: "relative" }}>
                <input
                  type="email"
                  className="input"
                  placeholder="e.g., krishna@agaate.farm"
                  value={value.email}
                  onChange={(e) => set({ email: e.target.value })}
                  style={{
                    ...inputStyle,
                    paddingRight: checking ? 32 : 11,
                  }}
                />
                {checking && (
                  <div style={{ position: "absolute", right: 10, top: 11, color: "#64748b" }}>
                    <Icons.Refresh size={14} className="spin" />
                  </div>
                )}
              </div>
            </Field>

            {/* Mobile Number */}
            <Field label="Mobile Number" error={errors["phone"] || errors["client.phone"]} required>
              <input
                type="tel"
                className="input"
                placeholder="e.g., 9876543210"
                value={value.phone}
                onChange={(e) => {
                  const val = e.target.value;
                  set({
                    phone: val,
                    ...(isSameAsMobile ? { whatsappNo: val } : {}),
                  });
                }}
                style={inputStyle}
              />
            </Field>

            {/* WhatsApp Number with [✓] Same as mobile toggle */}
            <Field label="WhatsApp Number" error={errors["whatsappNo"] || errors["client.whatsappNo"]}>
              <div style={{ position: "relative" }}>
                <input
                  type="tel"
                  className="input"
                  placeholder="e.g., 9876543210"
                  value={value.whatsappNo || ""}
                  onChange={(e) => set({ whatsappNo: e.target.value })}
                  disabled={isSameAsMobile}
                  style={{
                    ...inputStyle,
                    backgroundColor: isSameAsMobile ? "#f8fafc" : "#ffffff",
                    paddingRight: 125,
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
                    fontWeight: 600,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    border: isSameAsMobile ? "1px solid #0f172a" : "1px solid #e2e8f0",
                    backgroundColor: isSameAsMobile ? "#0f172a" : "#f8fafc",
                    color: isSameAsMobile ? "#ffffff" : "#64748b",
                    cursor: value.phone?.trim() ? "pointer" : "not-allowed",
                    transition: "all 0.15s ease",
                  }}
                  title="Link mobile number to WhatsApp"
                >
                  <div
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: 3,
                      border: isSameAsMobile ? "1px solid #ffffff" : "1.5px solid #cbd5e1",
                      backgroundColor: isSameAsMobile ? "#0f172a" : "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSameAsMobile && <Icons.Check size={9} strokeWidth={3} style={{ color: "#ffffff" }} />}
                  </div>
                  <span>Same as mob</span>
                </button>
              </div>
            </Field>

            {/* Business / Company Name */}
            <Field label="Business Name" error={errors["companyName"] || errors["client.companyName"]}>
              <input
                type="text"
                className="input"
                placeholder="e.g., Greenfield Agro Pvt Ltd (Optional)"
                value={value.companyName || ""}
                onChange={(e) => set({ companyName: e.target.value })}
                style={inputStyle}
              />
            </Field>

            {/* GST (GSTIN) */}
            <Field label="GST (GSTIN)" error={errors["gstin"] || errors["client.gstin"]}>
              <input
                type="text"
                className="input"
                placeholder="e.g., 29ABCDE1234F1Z5 (Optional)"
                value={value.gstin || ""}
                onChange={(e) => set({ gstin: e.target.value.toUpperCase() })}
                style={{
                  ...inputStyle,
                  fontFamily: "var(--font-mono, monospace)",
                }}
              />
            </Field>
          </div>
        </div>

        {/* ── RIGHT CARD: ADDRESS, BILLING & FINANCIAL CONNECT ───────── */}
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
                <Icons.MapPin size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                  Address, Billing & Financials
                </h3>
                <p style={{ fontSize: 11, color: "#64748b", margin: 0, marginTop: 1 }}>
                  Physical location, invoicing, and accounting contacts
                </p>
              </div>
            </div>

            <span
              style={{
                fontSize: 10.5,
                fontWeight: 600,
                color: "#15803d",
                background: "#f0fdf4",
                padding: "3px 8px",
                borderRadius: 5,
                border: "1px solid #bbf7d0",
              }}
            >
              Tax & Invoicing
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {/* Village */}
            <Field label="Village / Street" error={errors["village"] || errors["client.village"]} required>
              <input
                type="text"
                className="input"
                placeholder="e.g., Solur"
                value={value.village || ""}
                onChange={(e) => set({ village: e.target.value })}
                style={{
                  ...inputStyle,
                  fontSize: 12.5,
                  padding: "0 8px",
                }}
              />
            </Field>

            {/* City */}
            <Field label="City / Taluk" error={errors["city"] || errors["client.city"]} required>
              <input
                type="text"
                className="input"
                placeholder="e.g., Magadi"
                value={value.city || ""}
                onChange={(e) => set({ city: e.target.value })}
                style={{
                  ...inputStyle,
                  fontSize: 12.5,
                  padding: "0 8px",
                }}
              />
            </Field>

            {/* State */}
            <Field label="State" error={errors["state"] || errors["client.state"]} required>
              <input
                type="text"
                className="input"
                placeholder="e.g., Karnataka"
                value={value.state || ""}
                onChange={(e) => set({ state: e.target.value })}
                style={{
                  ...inputStyle,
                  fontSize: 12.5,
                  padding: "0 8px",
                }}
              />
            </Field>

            {/* PIN Code */}
            <Field label="PIN Code" error={errors["pincode"] || errors["client.pincode"]} required>
              <input
                type="text"
                className="input"
                placeholder="e.g., 562127"
                maxLength={6}
                value={value.pincode || ""}
                onChange={(e) => set({ pincode: e.target.value.replace(/\D/g, "") })}
                style={{
                  ...inputStyle,
                  fontSize: 12.5,
                  fontFamily: "var(--font-mono, monospace)",
                  padding: "0 8px",
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
                  className="input"
                  placeholder="e.g., 45 Greenfield Agri Tech Park, Hoskote, Bengaluru Rural"
                  value={value.billingAddress || ""}
                  onChange={(e) => set({ billingAddress: e.target.value })}
                  style={{
                    ...inputStyle,
                    paddingRight: 145,
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
                    fontWeight: 600,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    border: isSameAsAddress ? "1px solid #0f172a" : "1px solid #e2e8f0",
                    backgroundColor: isSameAsAddress ? "#0f172a" : "#f8fafc",
                    color: isSameAsAddress ? "#ffffff" : "#64748b",
                    cursor: addressSummary ? "pointer" : "not-allowed",
                    transition: "all 0.15s ease",
                  }}
                  title="Copy physical address to billing location"
                >
                  <div
                    style={{
                      width: 13,
                      height: 13,
                      borderRadius: 3,
                      border: isSameAsAddress ? "1px solid #ffffff" : "1.5px solid #cbd5e1",
                      backgroundColor: isSameAsAddress ? "#0f172a" : "#ffffff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSameAsAddress && <Icons.Check size={9} strokeWidth={3} style={{ color: "#ffffff" }} />}
                  </div>
                  <span>Same as address</span>
                </button>
              </div>
            </Field>
          </div>
        </div>
      </div>
    </div>
  );
}
