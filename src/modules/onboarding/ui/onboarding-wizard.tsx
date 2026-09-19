"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import {
  clientSchema,
  farmSchema,
  farmAdminCredentialsSchema,
  flattenIssues,
  newIdempotencyKey,
  submitSchema,
  type WizardData,
} from "./onboarding-schema";
import { clearLocal, hydrate, loadLocal, saveLocal, type StoredDraft } from "./onboarding-draft";
import { OnboardingStepClient } from "./onboarding-step-client";
import { OnboardingStepFarms } from "./onboarding-step-farms";
import { OnboardingStepClientCredentials } from "./onboarding-step-client-credentials";
import { OnboardingStepCompletion } from "./onboarding-step-completion";
import type { ActivationResult } from "./onboarding-step-review";

export type ServerDraftProp = {
  id: string;
  idempotencyKey: string;
  payload: Partial<WizardData>;
  updatedAt: string;
} | null;

const STEPS = [
  { label: "Client & Financials", stepNum: 1, Icon: Icons.User },
  { label: "Farm Addition",       stepNum: 2, Icon: Icons.Farm },
  { label: "Farm Admin Access",   stepNum: 3, Icon: Icons.Shield },
];

function validateStep(step: number, data: WizardData): Record<string, string> {
  if (step === 1) {
    const r = clientSchema.safeParse(data.client);
    return r.success ? {} : flattenIssues(r.error);
  }
  if (step === 2) {
    const out: Record<string, string> = {};
    if (!data.farms || data.farms.length === 0) {
      out["farms"] = "Please add at least one farm.";
      return out;
    }
    data.farms.forEach((f, i) => {
      const r = farmSchema.safeParse(f);
      if (!r.success) {
        for (const [k, v] of Object.entries(flattenIssues(r.error))) out[`farms.${i}.${k}`] = v;
      }
      const br = (f.boundaryRing ?? null) as [number, number][] | null;
      if (br && br.length > 0 && br.length < 4) {
        out[`farms.${i}.boundaryRing`] = "Incomplete fence — finish the polygon or clear it.";
      }
    });
    return out;
  }
  if (step === 3) {
    const r = farmAdminCredentialsSchema.safeParse(data.team);
    return r.success ? {} : flattenIssues(r.error);
  }
  const r = submitSchema.safeParse(data);
  if (r.success) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(flattenIssues(r.error))) {
    const key = k === "" ? "form" : k;
    out[key] = v;
    if (key.startsWith("client.")) out[key.replace(/^client\./, "")] = v;
    if (key.startsWith("team.")) out[key.replace(/^team\./, "")] = v;
  }
  return out;
}

export function OnboardingWizard({
  serverDraft,
  existingClientId,
  title,
  backHref = "/hq/onboarding",
}: {
  serverDraft: ServerDraftProp;
  existingClientId?: string;
  title?: string;
  backHref?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<WizardData>(() =>
    hydrate(serverDraft?.payload, serverDraft?.idempotencyKey ?? newIdempotencyKey())
  );
  const [draftId, setDraftId] = useState<string | null>(serverDraft?.id ?? null);
  const [step, setStep] = useState(1);
  const [maxVisited, setMaxVisited] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [asyncIssue, setAsyncIssue] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ActivationResult | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const dataRef = useRef(data);
  dataRef.current = data;
  const draftIdRef = useRef(draftId);
  draftIdRef.current = draftId;

  useEffect(() => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOnline(false);
      setNotice("Offline — saving on this device.");
    }
    const applyLocal = (local: StoredDraft | null) => {
      if (!local) {
        if (typeof navigator !== "undefined" && !navigator.onLine) setNotice("Offline — saving on this device.");
        return;
      }
      const serverTime = serverDraft ? Date.parse(serverDraft.updatedAt) : 0;
      const localTime = Date.parse(local.updatedAt);
      if (!serverDraft || localTime > serverTime) {
        const merged = hydrate(local.data, serverDraft?.idempotencyKey ?? local.idempotencyKey);
        if (serverDraft?.payload?.client) {
          merged.client = { ...merged.client, ...serverDraft.payload.client };
        }
        if (serverDraft) merged.idempotencyKey = serverDraft.idempotencyKey;
        setData(merged);
        if (local.draftId && !serverDraft) setDraftId(local.draftId);
      }
    };
    if (!existingClientId) {
      applyLocal(loadLocal(serverDraft?.id ?? null, existingClientId) ?? (serverDraft ? null : loadLocal(null)));
    }
    const on = () => {
      setOnline(true);
      setNotice(null);
    };
    const off = () => {
      setOnline(false);
      setNotice("Offline — saving on this device.");
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (result) return;
    const t = setTimeout(
      () =>
        saveLocal(
          draftIdRef.current,
          {
            draftId: draftIdRef.current,
            idempotencyKey: dataRef.current.idempotencyKey,
            updatedAt: new Date().toISOString(),
            data: dataRef.current,
          },
          existingClientId
        ),
      600
    );
    return () => clearTimeout(t);
  }, [data, draftId, existingClientId, result]);

  useEffect(() => {
    if (result || !online) return;
    const t = setTimeout(() => {
      const snap = dataRef.current;
      if (!snap.client.name.trim() && snap.farms.length === 0) return;
      setSaveState("saving");
      fetch("/api/hq/onboarding/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftIdRef.current,
          idempotencyKey: snap.idempotencyKey,
          payload: snap,
          clientName: snap.client.name.trim() || null,
          farmCount: snap.farms.length,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d?.id) {
            setSaveState("saved");
            setSavedAt(new Date().toISOString());
            return;
          }
          if (!draftIdRef.current) setDraftId(d.id);
          setSavedAt(d.updatedAt);
          setSaveState("saved");
        })
        .catch(() => {
          setSaveState("saved");
          setSavedAt(new Date().toISOString());
        });
    }, 2500);
    return () => clearTimeout(t);
  }, [data, draftId, online, result]);

  const goStep = (next: number) => {
    if (next > step) {
      const errs = validateStep(step, data);
      if (Object.keys(errs).length) {
        setErrors(errs);
        return;
      }
      if (step === 1 && asyncIssue) return;
    }
    setErrors({});
    setStep(next);
    setMaxVisited((m) => Math.max(m, next));
  };

  const activate = async () => {
    // Validate Step 3 specifically (and submitSchema)
    const errs = validateStep(3, data);
    if (Object.keys(errs).length) {
      setErrors(errs);
      setSubmitError(null);
      if (errs["name"] || errs["phone"] || errs["email"] || errs["billingAddress"] || asyncIssue) setStep(1);
      else if (Object.keys(errs).some((k) => k.startsWith("farms."))) setStep(2);
      else if (Object.keys(errs).some((k) => k.startsWith("team."))) setStep(3);
      return;
    }
    if (asyncIssue) {
      setStep(1);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/hq/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setSubmitError(body.error ?? "Activation failed. Draft is safe — fix and retry.");
        return;
      }
      setResult(body as ActivationResult);
      clearLocal(draftIdRef.current);
      if (body.deduped) toast.show("Duplicate submit — original activation shown.", "info");
      else toast.show("Client & Estate activated successfully.", "success");
    } catch {
      setSubmitError("Network error. Draft is safe — retry when connected.");
    } finally {
      setSubmitting(false);
    }
  };

  const discard = async () => {
    if (!window.confirm("Discard this draft? Cannot be undone.")) return;
    setDiscarding(true);
    try {
      if (draftIdRef.current)
        await fetch(`/api/hq/onboarding/drafts/${draftIdRef.current}`, { method: "DELETE" }).catch(() => undefined);
      clearLocal(draftIdRef.current);
      if (!draftIdRef.current) clearLocal(null);
      router.push("/hq/onboarding");
    } finally {
      setDiscarding(false);
    }
  };

  const saveLabel = !online
    ? "Offline"
    : saveState === "saving"
    ? "Saving…"
    : saveState === "saved" && savedAt
    ? `Saved ${new Date(savedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
    : saveState === "error"
    ? "Save failed"
    : "";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        width: "100%",
        maxWidth: 1140,
        margin: "0 auto",
        flex: 1,
        paddingBottom: 80,
      }}
    >
      {/* ── COMPLETE PILL-BASED FLOATING HEADER & STEPPER BAR ── */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: 9999,
          padding: "2px 4px 2px 18px",
          minHeight: 44,
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 14,
        }}
      >
        {/* Left: Return text + Longer Divider + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flexShrink: 0 }}>
          {backHref && (
            <Link
              href={backHref}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                fontWeight: 500,
                color: "#64748b",
                textDecoration: "none",
                background: "transparent",
                border: "none",
                padding: "4px 0",
                cursor: "pointer",
                transition: "color 0.15s ease",
                fontFamily: "var(--font-body)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#0f172a")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
              title="Return to list"
            >
              <Icons.ArrowLeft size={14} />
              <span>Return</span>
            </Link>
          )}

          {backHref && (
            <div
              style={{
                width: 1.5,
                height: 24,
                background: "#cbd5e1",
                flexShrink: 0,
                borderRadius: 1,
              }}
            />
          )}

          <h1
            style={{
              margin: 0,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', var(--font-body), sans-serif",
              color: "#1e293b",
              letterSpacing: "-0.015em",
              whiteSpace: "nowrap",
            }}
          >
            {title || (existingClientId && serverDraft?.payload?.client?.name ? `Onboard Estate for ${serverDraft.payload.client.name}` : "New Client Onboarding")}
          </h1>

          {existingClientId && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#15803d",
                background: "#f0fdf4",
                border: "1px solid #bbf7d0",
                padding: "2px 8px",
                borderRadius: 9999,
                letterSpacing: "0.02em",
              }}
            >
              HQ • {existingClientId.toUpperCase()}
            </span>
          )}
        </div>

        {/* Center: Sleek Stepper (Increased size to fill pill with 2px offset) */}
        {!result && (
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "#f1f5f9",
              padding: 3,
              borderRadius: 9999,
              border: "1px solid #e2e8f0",
              gap: 4,
              height: 38,
            }}
          >
            {STEPS.map((s, i) => {
              const n = i + 1;
              const done = n < step;
              const active = n === step;
              const locked = n > maxVisited;

              return (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => !locked && goStep(n)}
                  disabled={locked}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 9999,
                    border: "none",
                    background: active ? "#0f172a" : done ? "#ffffff" : "transparent",
                    color: active ? "#ffffff" : done ? "#0f172a" : "#64748b",
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    fontFamily: "var(--font-body)",
                    boxShadow: active
                      ? "0 2px 6px rgba(15, 23, 42, 0.22)"
                      : done
                      ? "0 1px 2px rgba(0, 0, 0, 0.04)"
                      : "none",
                    cursor: locked ? "not-allowed" : "pointer",
                    opacity: locked ? 0.45 : 1,
                    transition: "all 0.15s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      background: active ? "#ffffff" : done ? "#0f172a" : "#cbd5e1",
                      color: active ? "#0f172a" : done ? "#ffffff" : "#475569",
                    }}
                  >
                    {done ? <Icons.Check size={10} strokeWidth={3.5} /> : n}
                  </span>
                  <span>{s.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Right: Red Discard Pill Button (38px height with 2px gap) */}
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
          {result ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                fontWeight: 600,
                color: "#15803d",
                background: "#f0fdf4",
                padding: "0 14px",
                height: 38,
                borderRadius: 9999,
                border: "1px solid #bbf7d0",
              }}
            >
              <Icons.Check size={13} strokeWidth={3} />
              <span>Activated</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={discard}
              disabled={discarding}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 38,
                padding: "0 16px",
                fontSize: 12.5,
                fontWeight: 600,
                color: "#dc2626",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 9999,
                cursor: discarding ? "not-allowed" : "pointer",
                transition: "all 0.15s ease",
                fontFamily: "var(--font-body)",
              }}
              onMouseEnter={(e) => {
                if (!discarding) {
                  e.currentTarget.style.background = "#fee2e2";
                  e.currentTarget.style.borderColor = "#f87171";
                }
              }}
              onMouseLeave={(e) => {
                if (!discarding) {
                  e.currentTarget.style.background = "#fef2f2";
                  e.currentTarget.style.borderColor = "#fecaca";
                }
              }}
              title="Discard draft"
            >
              <Icons.Trash size={13} style={{ color: "#dc2626" }} />
              <span>{discarding ? "Discarding…" : "Discard"}</span>
            </button>
          )}
        </div>
      </div>


      {/* Alerts */}
      {(notice || Object.keys(errors).length > 0 || submitError) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {notice && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                background: "var(--surface)",
                border: "1px solid var(--line)",
                borderLeft: "3.5px solid var(--ink)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--ink)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Refresh size={13} style={{ color: "var(--green)" }} />
                <span>{notice}</span>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setNotice(null)}
                style={{ height: 24, padding: "0 6px", fontSize: 11 }}
              >
                Dismiss
              </button>
            </div>
          )}

          {submitError && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "var(--red-light)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--red)",
                fontWeight: 700,
              }}
            >
              <Icons.AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>{submitError}</span>
            </div>
          )}

          {Object.keys(errors).length > 0 && (
            <div
              role="alert"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "10px 14px",
                background: "var(--red-light)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--red)",
                fontWeight: 700,
              }}
            >
              <Icons.AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>
                Please check {Object.keys(errors).length} required field{Object.keys(errors).length > 1 ? "s" : ""}.
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── STEP CONTENT ─────────────────────────────────────────────── */}
      <div style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column" }}>
        {result ? (
          <OnboardingStepCompletion data={data} result={result} />
        ) : (
          <>
            {step === 1 && (
              <OnboardingStepClient
                value={data.client}
                onChange={(client) => setData((d) => ({ ...d, client }))}
                errors={errors}
                idempotencyKey={data.idempotencyKey}
                asyncIssue={asyncIssue}
                onAsyncIssue={setAsyncIssue}
                existingClientId={existingClientId}
              />
            )}
            {step === 2 && (
              <OnboardingStepFarms
                value={data.farms}
                onChange={(farms) => setData((d) => ({ ...d, farms }))}
                errors={errors}
                client={data.client}
                contacts={data.contacts}
              />
            )}
            {step === 3 && (
              <OnboardingStepClientCredentials
                value={data.team}
                onChange={(team) => setData((d) => ({ ...d, team }))}
                client={data.client}
                farms={data.farms}
                errors={errors}
              />
            )}
          </>
        )}
      </div>

      {/* ── STUCK BOTTOM ACTION BAR (FIXED 60PX HEIGHT) ─────────────── */}
      {!result && (
        <div className="onboarding-docked-footer">
          <div
            style={{
              width: "100%",
              maxWidth: 1140,
              margin: "0 auto",
              padding: "0 24px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => goStep(step - 1)}
              disabled={step === 1}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                height: 38,
                fontWeight: 600,
                fontSize: 13,
                borderRadius: 9999,
                border: "1px solid #cbd5e1",
                color: step === 1 ? "#94a3b8" : "#334155",
                backgroundColor: step === 1 ? "#f8fafc" : "#ffffff",
                cursor: step === 1 ? "not-allowed" : "pointer",
                opacity: step === 1 ? 0.45 : 1,
                transition: "all 0.15s ease",
              }}
            >
              <Icons.ArrowLeft size={14} />
              <span>Back</span>
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {step < 3 ? (
                <button
                  type="button"
                  onClick={() => goStep(step + 1)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 24px",
                    height: 38,
                    fontWeight: 700,
                    fontSize: 13,
                    background: "#0f172a",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 9999,
                    boxShadow: "0 2px 6px rgba(15, 23, 42, 0.2)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>Continue to {STEPS[step]?.label}</span>
                  <Icons.ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={activate}
                  disabled={submitting}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 26px",
                    height: 38,
                    fontWeight: 700,
                    fontSize: 13,
                    background: "#15803d",
                    color: "#ffffff",
                    border: "none",
                    borderRadius: 9999,
                    boxShadow: "0 2px 8px rgba(21, 128, 61, 0.25)",
                    cursor: submitting ? "not-allowed" : "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <span>{submitting ? "Activating Estate…" : "Activate Client & Farm Admin"}</span>
                  <Icons.Zap size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
