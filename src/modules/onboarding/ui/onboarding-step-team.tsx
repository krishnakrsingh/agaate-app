"use client";
import { useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { MIN_PASSWORD_LENGTH, type TeamInput } from "./onboarding-schema";

const DEFAULT_AGRONOMISTS = [
  { id: "agr_1", name: "Dr. Ananya Rao", email: "ananya.rao@agaate.com", phone: "9845012345", title: "Senior Agronomist (Horticulture)" },
  { id: "agr_2", name: "Kavita Deshmukh", email: "kavita.d@agaate.com", phone: "9845067890", title: "Lead Soil & Crop Specialist" },
  { id: "agr_3", name: "Dr. Pradeep Verma", email: "pradeep.v@agaate.com", phone: "9845099887", title: "Principal Agronomist" },
];

const DEFAULT_FIELD_OFFICERS = [
  { id: "fo_1", name: "Sanjay Kumar", email: "sanjay.k@agaate.com", phone: "9876012345", title: "Senior Field Operations Officer" },
  { id: "fo_2", name: "Venkatesh Babu", email: "venkatesh.b@agaate.com", phone: "9876023456", title: "Field Officer (Bangalore Rural Hub)" },
  { id: "fo_3", name: "Girish Patel", email: "girish.p@agaate.com", phone: "9876034567", title: "Field Officer (Irrigation & Setup)" },
];

export function OnboardingStepTeam({
  value,
  onChange,
  errors,
  clientName,
  clientEmail,
}: {
  value: TeamInput;
  onChange: (v: TeamInput) => void;
  errors: Record<string, string>;
  clientName: string;
  clientEmail: string;
}) {
  const [agronomists, setAgronomists] = useState(DEFAULT_AGRONOMISTS);
  const [fieldOfficers, setFieldOfficers] = useState(DEFAULT_FIELD_OFFICERS);
  const [showPw, setShowPw] = useState(false);

  const set = (p: Partial<TeamInput>) => onChange({ ...value, ...p });

  // Fetch real users if available
  useEffect(() => {
    fetch("/api/hq/people", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.users)) {
          const agrs = data.users.filter((u: any) => u.role === "AGRONOMIST" && u.active);
          const fos = data.users.filter((u: any) => u.role === "FARM_OFFICER" && u.active);
          if (agrs.length > 0) setAgronomists(agrs.map((u: any) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || "—", title: "Staff Agronomist" })));
          if (fos.length > 0) setFieldOfficers(fos.map((u: any) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone || "—", title: "Field Officer" })));
        }
      })
      .catch(() => {});
  }, []);

  const selectedAgronomist = agronomists.find((a) => a.id === value.agronomistId);
  const selectedFieldOfficer = fieldOfficers.find((f) => f.id === value.fieldOfficerId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* ── Field Team Assignment Header ─────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "50%",
              background: "var(--surface-strong)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
            }}
          >
            👥
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Field Operations Team
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              Assign Agronomist & Field Officer
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 10px",
            borderRadius: 20,
            background: "var(--green-light, #dcfce7)",
            color: "var(--green, #15803d)",
          }}
        >
          STEP 6 OF 7
        </span>
      </div>

      {/* ── Agronomist Selection ─────────────────────────────────────────── */}
      <div
        style={{
          background: "var(--surface-card)",
          border: errors["agronomistId"] ? "1px solid var(--semantic-error, #dc2626)" : "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          padding: "20px 24px",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              1. Assigned Agronomist <span style={{ color: "var(--semantic-error, #dc2626)", marginLeft: 3, fontWeight: 700 }}>*</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Responsible for crop advisory, nutrition protocols, and health scouting</div>
            {errors["agronomistId"] && (
              <div style={{ fontSize: 12, color: "var(--semantic-error, #dc2626)", fontWeight: 600, marginTop: 4 }}>
                ⚠️ {errors["agronomistId"]}
              </div>
            )}
          </div>

          {selectedAgronomist && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => set({ agronomistId: null, agronomistName: null })}
              style={{ fontSize: 11, color: "var(--muted)" }}
            >
              Change
            </button>
          )}
        </div>

        {selectedAgronomist ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: "var(--surface-strong)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--green, #15803d)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {selectedAgronomist.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{selectedAgronomist.name}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "var(--green-light, #dcfce7)",
                      color: "var(--green, #15803d)",
                    }}
                  >
                    AGRONOMIST
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {selectedAgronomist.title} · 📞 {selectedAgronomist.phone} · ✉️ {selectedAgronomist.email}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {agronomists.map((a) => (
              <div
                key={a.id}
                onClick={() => set({ agronomistId: a.id, agronomistName: a.name })}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: `1px solid ${value.agronomistId === a.id ? "var(--green, #15803d)" : "var(--hairline)"}`,
                  background: value.agronomistId === a.id ? "var(--green-light, #dcfce7)" : "var(--surface-card)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "var(--surface-strong)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {a.name.slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{a.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Field Officer Selection ──────────────────────────────────────── */}
      <div
        style={{
          background: "var(--surface-card)",
          border: errors["fieldOfficerId"] ? "1px solid var(--semantic-error, #dc2626)" : "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          padding: "20px 24px",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              2. Assigned Field Officer <span style={{ color: "var(--semantic-error, #dc2626)", marginLeft: 3, fontWeight: 700 }}>*</span>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>Responsible for daily task execution, biometric attendance, and plot log updates</div>
            {errors["fieldOfficerId"] && (
              <div style={{ fontSize: 12, color: "var(--semantic-error, #dc2626)", fontWeight: 600, marginTop: 4 }}>
                ⚠️ {errors["fieldOfficerId"]}
              </div>
            )}
          </div>

          {selectedFieldOfficer && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => set({ fieldOfficerId: null, fieldOfficerName: null })}
              style={{ fontSize: 11, color: "var(--muted)" }}
            >
              Change
            </button>
          )}
        </div>

        {selectedFieldOfficer ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 18px",
              background: "var(--surface-strong)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "var(--ink)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {selectedFieldOfficer.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{selectedFieldOfficer.name}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: "var(--surface-strong)",
                      border: "1px solid var(--hairline)",
                      color: "var(--ink)",
                    }}
                  >
                    FIELD OFFICER
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {selectedFieldOfficer.title} · 📞 {selectedFieldOfficer.phone} · ✉️ {selectedFieldOfficer.email}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12 }}>
            {fieldOfficers.map((fo) => (
              <div
                key={fo.id}
                onClick={() => set({ fieldOfficerId: fo.id, fieldOfficerName: fo.name })}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  border: `1px solid ${value.fieldOfficerId === fo.id ? "var(--ink)" : "var(--hairline)"}`,
                  background: value.fieldOfficerId === fo.id ? "var(--surface-strong)" : "var(--surface-card)",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "var(--surface-strong)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 12,
                    }}
                  >
                    {fo.name.slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>{fo.name}</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{fo.title}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Automatic First Task Provisioning ─────────────────────────────── */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderLeft: "4px solid var(--green, #15803d)",
          borderRadius: "var(--radius-md)",
          padding: "18px 22px",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 16 }}>📋</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                Automatic First Task Creation
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)" }}>
                Provisions the first operational setup task for the assigned field officer immediately upon activation
              </div>
            </div>
          </div>

          <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={value.createFirstTask ?? true}
              onChange={(e) => set({ createFirstTask: e.target.checked })}
            />
            <span>Create First Task</span>
          </label>
        </div>

        {value.createFirstTask && (
          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>
              Initial Task Title
            </label>
            <input
              className="input-field"
              value={value.firstTaskTitle ?? "Initial Demarcation & Soil Testing"}
              onChange={(e) => set({ firstTaskTitle: e.target.value })}
              style={{ borderRadius: 8 }}
            />
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
              Assigned to: <strong>{selectedFieldOfficer?.name || "Field Officer"}</strong> · Linked to: <strong>Client → Farm → First Plot</strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
