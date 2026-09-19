"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
}: {
  serverDraft: ServerDraftProp;
  existingClientId?: string;
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
    <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%", maxWidth: 1140, margin: "0 auto" }}>
      {/* ── TOP HORIZONTAL STEPPER RIBBON (NO LEFT SIDEBAR) ─────────────── */}
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #d5e4d8",
          borderRadius: 14,
          padding: "14px 18px",
          boxShadow: "0 1px 3px rgba(21, 128, 61, 0.04), 0 4px 12px rgba(21, 128, 61, 0.02)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* Top Header: Step Status, Auto-Save Status, and Discard */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: "#f1f5f9",
                color: "#0f172a",
                border: "1px solid #e2e8f0",
                padding: "3px 9px",
                borderRadius: 6,
                letterSpacing: "0.02em",
              }}
            >
              {result ? "Complete" : `Step ${step} of ${STEPS.length}`}
            </span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              {result ? "Estate Activated" : STEPS[step - 1].label}
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {result ? (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "#15803d",
                  background: "#f0fdf4",
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid #bbf7d0",
                }}
              >
                <Icons.Check size={13} strokeWidth={3} />
                <span>Account Activated</span>
              </div>
            ) : (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 600,
                  color: "#64748b",
                  background: "#f8fafc",
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: saveState === "saving" ? "#d97706" : online ? "#15803d" : "#94a3b8",
                  }}
                />
                <span>{saveLabel || "Draft Auto-Saved"}</span>
              </div>
            )}

            {!result && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: "#64748b", fontSize: 11.5, height: 26, padding: "2px 8px" }}
                onClick={discard}
                disabled={discarding}
              >
                <Icons.Trash size={12} />
                <span style={{ marginLeft: 4 }}>{discarding ? "Discarding…" : "Discard"}</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Step Indicator Pills */}
        {!result && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${STEPS.length}, minmax(0, 1fr))`,
              gap: 8,
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
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: active
                      ? "1px solid #0f172a"
                      : done
                      ? "1px solid #cbd5e1"
                      : "1px solid #e2e8f0",
                    background: active
                      ? "#0f172a"
                      : done
                      ? "#f8fafc"
                      : "#ffffff",
                    color: active ? "#ffffff" : done ? "#0f172a" : "#64748b",
                    boxShadow: active ? "0 2px 8px rgba(15, 23, 42, 0.2)" : "0 1px 2px rgba(0,0,0,0.02)",
                    cursor: locked ? "not-allowed" : "pointer",
                    opacity: locked ? 0.5 : 1,
                    transition: "all 0.15s ease",
                    textAlign: "left",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10.5,
                      fontWeight: 700,
                      flexShrink: 0,
                      background: active ? "#ffffff" : done ? "#0f172a" : "#f1f5f9",
                      color: active ? "#0f172a" : done ? "#ffffff" : "#64748b",
                    }}
                  >
                    {done ? <Icons.Check size={11} strokeWidth={3} /> : n}
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: active ? 700 : 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
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
      <div style={{ minWidth: 0 }}>
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

      {/* ── BOTTOM ACTION BAR (ZERO SCROLL COUPLING) ─────────────────── */}
      {!result && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            background: "#ffffff",
            border: "1px solid #d5e4d8",
            borderRadius: 14,
            boxShadow: "0 1px 3px rgba(21, 128, 61, 0.04)",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => goStep(step - 1)}
            disabled={step === 1}
            style={{
              padding: "8px 18px",
              height: 38,
              fontWeight: 600,
              fontSize: 12.5,
              gap: 6,
              border: "1px solid #d5ded7",
              color: "#334155",
              backgroundColor: "#ffffff",
              borderRadius: 8,
            }}
          >
            <Icons.ArrowLeft size={13} />
            <span>Back</span>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step < 3 ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => goStep(step + 1)}
                style={{
                  padding: "8px 24px",
                  height: 38,
                  fontWeight: 700,
                  fontSize: 13,
                  gap: 8,
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  boxShadow: "0 2px 6px rgba(15, 23, 42, 0.2)",
                  cursor: "pointer",
                }}
              >
                <span>Continue to {STEPS[step]?.label}</span>
                <Icons.ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={activate}
                disabled={submitting}
                style={{
                  padding: "8px 26px",
                  height: 38,
                  fontWeight: 700,
                  fontSize: 13,
                  gap: 8,
                  background: "#0f172a",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(15, 23, 42, 0.25)",
                  cursor: submitting ? "not-allowed" : "pointer",
                }}
              >
                <span>{submitting ? "Activating Estate…" : "Activate Client & Farm Admin"}</span>
                <Icons.Zap size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
