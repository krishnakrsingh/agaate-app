"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import {
  clientSchema, contactsSchema, farmSchema, flattenIssues, newIdempotencyKey,
  plotSchema, cropSchema, submitSchema, teamSchema, type WizardData,
} from "./onboarding-schema";
import { clearLocal, hydrate, loadLocal, saveLocal, type StoredDraft } from "./onboarding-draft";
import { ringWithinRing } from "@modules/spatial";
import { OnboardingStepClient } from "./onboarding-step-client";
import { OnboardingStepContacts } from "./onboarding-step-contacts";
import { OnboardingStepFarms } from "./onboarding-step-farms";
import { OnboardingStepPlots } from "./onboarding-step-plots";
import { OnboardingStepCrops } from "./onboarding-step-crops";
import { OnboardingStepTeam } from "./onboarding-step-team";
import { OnboardingStepCompletion } from "./onboarding-step-completion";
import { OnboardingStepReview, type ActivationResult } from "./onboarding-step-review";

export type ServerDraftProp = {
  id: string; idempotencyKey: string; payload: Partial<WizardData>; updatedAt: string;
} | null;

const STEPS = [
  { label: "Client",   stepNum: 1, Icon: Icons.User },
  { label: "Contacts", stepNum: 2, Icon: Icons.Users },
  { label: "Farm",     stepNum: 3, Icon: Icons.Farm },
  { label: "Plots",    stepNum: 4, Icon: Icons.Plot },
  { label: "Crops",    stepNum: 5, Icon: Icons.Leaf },
  { label: "Team",     stepNum: 6, Icon: Icons.Shield },
  { label: "Complete", stepNum: 7, Icon: Icons.CheckCircle },
];

function plotCrossErrors(data: WizardData): Record<string, string> {
  const out: Record<string, string> = {};
  const farmByRow = new Map(data.farms.map((f, i) => [f.rowId ?? `index:${i}`, { farm: f, index: i }]));
  const seen = new Map<string, number>();
  data.plots.forEach((p, i) => {
    const holder = farmByRow.get(p.farmRowId);
    if (!holder) { out[`plots.${i}.farmRowId`] = "Plot refers to a farm that no longer exists."; return; }
    const key = `${p.farmRowId}::${p.name.trim().toLowerCase()}`;
    const first = seen.get(key);
    if (first !== undefined) out[`plots.${i}.name`] = `Duplicate of plot row ${first + 1}.`;
    else seen.set(key, i);
    const cap = Number(holder.farm.cultivableArea);
    if (Number.isFinite(cap) && cap > 0 && Number(p.area) > cap) out[`plots.${i}.area`] = "Exceeds farm cultivable area.";
    // Re-check containment: the farm fence may have changed after this plot was queued.
    const pr = (p.boundaryRing ?? null) as [number, number][] | null;
    const fr = (holder.farm.boundaryRing ?? null) as [number, number][] | null;
    if (pr && pr.length >= 4 && fr && fr.length >= 4) {
      try {
        if (!ringWithinRing(pr, fr)) out[`plots.${i}.boundaryRing`] = "Plot fence lies outside its farm fence — redraw.";
      } catch { out[`plots.${i}.boundaryRing`] = "Plot fence is invalid — redraw."; }
    }
    if (pr && pr.length > 0 && pr.length < 4) out[`plots.${i}.boundaryRing`] = "Incomplete fence — finish the polygon or clear it.";
  });
  return out;
}

function validateStep(step: number, data: WizardData): Record<string, string> {
  if (step === 1) {
    const r = clientSchema.safeParse(data.client);
    return r.success ? {} : flattenIssues(r.error);
  }
  if (step === 2) {
    const r = contactsSchema.safeParse(data.contacts);
    return r.success ? {} : flattenIssues(r.error);
  }
  if (step === 3) {
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
  if (step === 4) {
    const out: Record<string, string> = {};
    data.plots.forEach((p, i) => {
      const r = plotSchema.safeParse(p);
      if (!r.success) {
        for (const [k, v] of Object.entries(flattenIssues(r.error))) out[`plots.${i}.${k}`] = v;
      }
    });
    return { ...out, ...plotCrossErrors(data) };
  }
  if (step === 5) {
    const out: Record<string, string> = {};
    data.crops.forEach((c, i) => {
      const r = cropSchema.safeParse(c);
      if (!r.success) {
        for (const [k, v] of Object.entries(flattenIssues(r.error))) out[`crops.${i}.${k}`] = v;
      }
    });
    return out;
  }
  if (step === 6) {
    const r = teamSchema.safeParse(data.team);
    return r.success ? {} : flattenIssues(r.error);
  }
  const r = submitSchema.safeParse(data);
  if (r.success) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(flattenIssues(r.error))) {
    const key = k === "" ? "form" : k;
    out[key] = v;
    // Remap prefixed keys so step components show field-level errors.
    if (key.startsWith("client.")) out[key.replace(/^client\./, "")] = v;
    if (key.startsWith("contacts.")) out[key.replace(/^contacts\./, "")] = v;
    if (key.startsWith("team.")) out[key.replace(/^team\./, "")] = v;
  }
  return out;
}

export function OnboardingWizard({ serverDraft, existingClientId }: { serverDraft: ServerDraftProp; existingClientId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<WizardData>(() => hydrate(serverDraft?.payload, serverDraft?.idempotencyKey ?? newIdempotencyKey()));
  const [draftId, setDraftId] = useState<string | null>(serverDraft?.id ?? null);
  const [step, setStep] = useState(1);
  const [maxVisited, setMaxVisited] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [asyncIssue, setAsyncIssue] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<ActivationResult | null>(null);
  const [discarding, setDiscarding] = useState(false);
  const dataRef = useRef(data); dataRef.current = data;
  const draftIdRef = useRef(draftId); draftIdRef.current = draftId;

  useEffect(() => {
    const applyLocal = (local: StoredDraft | null) => {
      if (!local) { if (!navigator.onLine) setNotice("Offline — saving on this device."); return; }
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
        setNotice(`Draft recovered from ${new Date(localTime).toLocaleString()}.`);
      }
    };
    if (!existingClientId) {
      applyLocal(loadLocal(serverDraft?.id ?? null, existingClientId) ?? (serverDraft ? null : loadLocal(null)));
    }
    const on = () => { setOnline(true); setNotice(null); };
    const off = () => { setOnline(false); setNotice("Offline — saving on this device."); };
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (result) return;
    const t = setTimeout(() => saveLocal(draftIdRef.current, { draftId: draftIdRef.current, idempotencyKey: dataRef.current.idempotencyKey, updatedAt: new Date().toISOString(), data: dataRef.current }, existingClientId), 600);
    return () => clearTimeout(t);
  }, [data, draftId, existingClientId, result]);

  useEffect(() => {
    if (result || !online) return;
    const t = setTimeout(() => {
      const snap = dataRef.current;
      if (!snap.client.name.trim() && snap.farms.length === 0) return;
      setSaveState("saving");
      fetch("/api/hq/onboarding/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draftIdRef.current, idempotencyKey: snap.idempotencyKey, payload: snap, clientName: snap.client.name.trim() || null, farmCount: snap.farms.length }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!d?.id) { setSaveState("saved"); setSavedAt(new Date().toISOString()); return; } if (!draftIdRef.current) setDraftId(d.id); setSavedAt(d.updatedAt); setSaveState("saved"); })
        .catch(() => { setSaveState("saved"); setSavedAt(new Date().toISOString()); });
    }, 2500);
    return () => clearTimeout(t);
  }, [data, draftId, online, result]);

  const goStep = (next: number) => {
    if (next > step) {
      const errs = validateStep(step, data);
      if (Object.keys(errs).length) { setErrors(errs); return; }
      if (step === 1 && asyncIssue) return;
    }
    setErrors({}); setStep(next); setMaxVisited((m) => Math.max(m, next));
  };

  const activate = async () => {
    const errs = validateStep(7, data);
    if (Object.keys(errs).length) {
      setErrors(errs); setSubmitError(null);
      if (errs["client.name"] || Object.keys(errs).some((k) => k.startsWith("client.")) || asyncIssue) setStep(1);
      else if (Object.keys(errs).some((k) => k.startsWith("contacts."))) setStep(2);
      else if (Object.keys(errs).some((k) => k.startsWith("farms."))) setStep(3);
      else if (Object.keys(errs).some((k) => k.startsWith("plots."))) setStep(4);
      else if (Object.keys(errs).some((k) => k.startsWith("crops."))) setStep(5);
      else if (Object.keys(errs).some((k) => k.startsWith("team."))) setStep(6);
      return;
    }
    if (asyncIssue) { setStep(1); return; }
    setSubmitting(true); setSubmitError(null);
    try {
      const res = await fetch("/api/hq/onboarding/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setSubmitError(body.error ?? "Activation failed. Draft is safe — fix and retry."); return; }
      setResult(body as ActivationResult);
      setStep(7);
      setMaxVisited(7);
      clearLocal(draftIdRef.current);
      if (body.deduped) toast.show("Duplicate submit — original activation shown.", "info");
      else toast.show("Farm setup activated successfully.", "success");
    } catch { setSubmitError("Network error. Draft is safe — retry when connected."); }
    finally { setSubmitting(false); }
  };

  const discard = async () => {
    if (!window.confirm("Discard this draft? Cannot be undone.")) return;
    setDiscarding(true);
    try {
      if (draftIdRef.current) await fetch(`/api/hq/onboarding/drafts/${draftIdRef.current}`, { method: "DELETE" }).catch(() => undefined);
      clearLocal(draftIdRef.current);
      if (!draftIdRef.current) clearLocal(null);
      router.push("/hq/onboarding");
    } finally { setDiscarding(false); }
  };

  // ── WIZARD ───────────────────────────────────────────────────────────────
  const saveLabel = !online ? "Offline" : saveState === "saving" ? "Saving…" : saveState === "saved" && savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : saveState === "error" ? "Save failed" : "";

  return (
    <>
      <style>{`
        .ob-wrap { display: grid; grid-template-columns: 240px minmax(0, 1fr); gap: 24px; align-items: start; }
        .ob-rail { position: sticky; top: 74px; background: var(--surface-card); border: 1px solid var(--hairline); border-radius: var(--radius-lg, 12px); padding: 16px; box-shadow: var(--shadow-card); }
        .ob-wrap .input-field { height: 38px; font-size: 13px; padding: 6px 12px; border-radius: 8px; }
        .ob-wrap select.input-field { height: 38px; }
        .ob-grid-2 { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 16px; }
        .ob-grid-3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px 16px; }
        .ob-farm-grid { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 18px; align-items: start; }
        .ob-section { display: flex; flex-direction: column; gap: 16px; }
        .ob-section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted); margin-bottom: 8px; }
        .ob-nav { position: sticky; bottom: 0; background: var(--surface-card); padding: 12px 18px; border: 1px solid var(--hairline); border-radius: var(--radius-md, 10px); margin-top: 16px; box-shadow: 0 -2px 12px rgba(0,0,0,0.04); }
        .ob-rail-item { transition: all 0.15s ease; border-radius: 8px; margin-bottom: 4px; }
        .ob-rail-item:hover:not(:disabled) { background: var(--surface-strong); }
        details summary { list-style: none; }
        details summary::-webkit-details-marker { display: none; }
        details[open] summary .ob-chevron { transform: rotate(180deg); }
        @media (max-width: 1100px) {
          .ob-farm-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 768px) {
          .ob-wrap { grid-template-columns: 1fr; gap: 16px; }
          .ob-grid-2, .ob-grid-3 { grid-template-columns: 1fr; }
          .ob-rail { position: static; display: flex; overflow-x: auto; border-radius: 10px; padding: 8px; margin-bottom: 16px; }
          .ob-rail-item { min-width: 90px; flex-direction: column !important; padding: 8px !important; margin-bottom: 0; text-align: center; }
          .ob-rail-foot { display: none !important; }
        }
      `}</style>

      {/* Alerts */}
      {(notice || Object.keys(errors).length > 0) && (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {notice && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 14px", background: "var(--surface-card)", border: "1px solid var(--hairline)",
              borderLeft: "3.5px solid var(--ink)",
              borderRadius: "var(--radius-md)", fontSize: 12.5, color: "var(--ink)",
              boxShadow: "var(--shadow-card)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--surface-strong)", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid var(--hairline)", flexShrink: 0 }}>
                  <Icons.Refresh size={13} style={{ color: "var(--ink)" }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", background: "var(--surface-strong)", border: "1px solid var(--hairline)", padding: "2px 7px", borderRadius: 4, color: "var(--ink)" }}>
                    Draft Recovered
                  </span>
                  <span style={{ color: "var(--muted)" }}>Loaded locally saved progress from your device.</span>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setNotice(null)}
                style={{ height: 28, padding: "0 10px", fontSize: 11.5, gap: 4, flexShrink: 0 }}
              >
                <Icons.X size={12} />
                <span>Dismiss</span>
              </button>
            </div>
          )}
          {Object.keys(errors).length > 0 && (
            <div role="alert" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "var(--red-light, #fef2f2)", border: "1px solid var(--semantic-error, #fecaca)", borderRadius: 10, fontSize: 12, color: "var(--semantic-error, #dc2626)", fontWeight: 600 }}>
              <Icons.AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>Please review {Object.keys(errors).length} field issue{Object.keys(errors).length > 1 ? "s" : ""} before continuing.</span>
            </div>
          )}
        </div>
      )}

      <div className="ob-wrap">

        {/* ── RAIL ─────────────────────────────────────────────────────── */}
        <nav className="ob-rail" aria-label="Steps">
          {/* Stepper Progress Bar */}
          <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--hairline)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--muted)", marginBottom: 6 }}>
              <span>Progress</span>
              <span style={{ color: "var(--ink)" }}>{Math.round((step / STEPS.length) * 100)}%</span>
            </div>
            <div style={{ height: 5, background: "var(--hairline)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(step / STEPS.length) * 100}%`, background: "var(--ink)", transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1)", borderRadius: 4 }} />
            </div>
          </div>

          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n < step || (n === 7 && !!result);
            const active = n === step;
            const locked = n > maxVisited && !result;
            return (
              <button
                key={s.label}
                type="button"
                className="ob-rail-item"
                aria-current={active ? "step" : undefined}
                onClick={() => !locked && goStep(n)}
                disabled={locked}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "9px 12px", background: active ? "var(--surface-strong)" : "transparent",
                  border: "none",
                  cursor: locked ? "not-allowed" : "pointer",
                  opacity: locked ? 0.4 : 1,
                  textAlign: "left",
                }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, flexShrink: 0,
                  background: done ? "var(--green, #16a34a)" : active ? "var(--ink)" : "var(--surface-card)",
                  border: done ? "none" : active ? "none" : "1.5px solid var(--hairline-strong)",
                  color: done || active ? "#fff" : "var(--muted)",
                  boxShadow: active ? "0 2px 6px rgba(0,0,0,0.12)" : undefined,
                }}>
                  {done ? <Icons.Check size={12} style={{ strokeWidth: 3 }} /> : s.stepNum}
                </div>
                <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "var(--ink)" : done ? "var(--body-strong)" : "var(--muted)", whiteSpace: "nowrap" }}>{s.label}</div>
                  <div style={{ fontSize: 10, color: "var(--muted)", marginTop: 1 }}>Step {n} of {STEPS.length}</div>
                </div>
              </button>
            );
          })}

          {/* Save status */}
          <div className="ob-rail-foot" style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--hairline)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%",
              background: saveState === "saving" ? "var(--amber)" : online ? "var(--green, #22c55e)" : "var(--muted)",
              boxShadow: online && saveState === "saved" ? "0 0 6px rgba(34, 197, 94, 0.7)" : undefined,
              display: "inline-block", flexShrink: 0
            }} />
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>
              {saveState === "saving" ? "Saving progress…" : online ? (saveLabel || "Draft Auto-Saved") : "Saved Offline"}
            </div>
          </div>
        </nav>

        {/* ── CONTENT ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          {/* Step title */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, paddingBottom: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 11, fontWeight: 700, background: "var(--surface-strong)", border: "1px solid var(--hairline)", padding: "3px 8px", borderRadius: 6, color: "var(--muted)" }}>
                Step {step} of {STEPS.length}
              </span>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>{STEPS[step - 1].label}</h2>
            </div>
            {!result && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ color: "var(--muted)", fontSize: 12, height: 30, padding: "4px 8px" }}
                onClick={discard}
                disabled={discarding}
              >
                <Icons.Trash size={13} /><span style={{ marginLeft: 4 }}>{discarding ? "Discarding…" : "Discard Draft"}</span>
              </button>
            )}
          </div>

          {/* Step content */}
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
            <OnboardingStepContacts
              value={data.contacts}
              onChange={(contacts) => setData((d) => ({ ...d, contacts }))}
              client={data.client}
              errors={errors}
            />
          )}
          {step === 3 && (
            <OnboardingStepFarms
              value={data.farms}
              onChange={(farms) => setData((d) => ({ ...d, farms }))}
              errors={errors}
              client={data.client}
              contacts={data.contacts}
            />
          )}
          {step === 4 && (
            <OnboardingStepPlots
              plots={data.plots}
              farms={data.farms}
              onChange={(plots) => setData((d) => ({ ...d, plots }))}
              errors={errors}
            />
          )}
          {step === 5 && (
            <OnboardingStepCrops
              crops={data.crops}
              plots={data.plots}
              farms={data.farms}
              onChange={(crops) => setData((d) => ({ ...d, crops }))}
              errors={errors}
            />
          )}
          {step === 6 && (
            <OnboardingStepTeam
              value={data.team}
              onChange={(team) => setData((d) => ({ ...d, team }))}
              errors={errors}
              clientName={data.client.name}
              clientEmail={data.client.email ?? ""}
            />
          )}
          {step === 7 && (
            result ? (
              <OnboardingStepCompletion data={data} result={result} />
            ) : (
              <OnboardingStepReview
                data={data}
                submitting={submitting}
                submitError={submitError}
                onActivate={activate}
              />
            )
          )}

          {/* Nav — sticky so Continue is always visible without scrolling */}
          {!(step === 7 && result) && (
            <div
              className="ob-nav"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => goStep(step - 1)}
                disabled={step === 1}
                style={{ padding: "6px 16px", height: 34, gap: 6 }}
              >
                <Icons.ArrowLeft size={13} />
                <span>Back</span>
              </button>
              {step < 6 ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => goStep(step + 1)}
                  disabled={step === 1 && !!asyncIssue}
                  style={{ padding: "6px 20px", height: 34, gap: 6 }}
                >
                  <span>Continue to {STEPS[step]?.label}</span>
                  <Icons.ArrowRight size={13} />
                </button>
              ) : step === 6 ? (
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => goStep(7)}
                  style={{ padding: "6px 22px", height: 34, gap: 6, fontWeight: 700 }}
                >
                  <span>Review & Complete</span>
                  <Icons.ArrowRight size={14} />
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-green btn-sm"
                  onClick={activate}
                  disabled={submitting}
                  style={{ padding: "6px 24px", height: 36, gap: 8, fontWeight: 700 }}
                >
                  <span>{submitting ? "Activating Farm Setup…" : "Activate Farm & Complete"}</span>
                  <Icons.CheckCircle size={15} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
