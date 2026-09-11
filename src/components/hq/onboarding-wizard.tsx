"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import {
  clientSchema, farmSchema, flattenIssues, newIdempotencyKey,
  plotSchema, submitSchema, teamSchema, type WizardData,
} from "./onboarding-schema";
import { clearLocal, hydrate, loadLocal, saveLocal, type StoredDraft } from "./onboarding-draft";
import { OnboardingStepClient } from "./onboarding-step-client";
import { OnboardingStepFarms } from "./onboarding-step-farms";
import { OnboardingStepPlots } from "./onboarding-step-plots";
import { OnboardingStepTeam } from "./onboarding-step-team";
import { OnboardingStepReview, type ActivationResult } from "./onboarding-step-review";

export type ServerDraftProp = {
  id: string; idempotencyKey: string; payload: Partial<WizardData>; updatedAt: string;
} | null;

const STEPS = [
  { label: "Client", icon: "👤" },
  { label: "Farms",  icon: "🌾" },
  { label: "Plots",  icon: "📐" },
  { label: "Team",   icon: "🔐" },
  { label: "Review", icon: "✅" },
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
  });
  return out;
}

function validateStep(step: number, data: WizardData): Record<string, string> {
  if (step === 1) { const r = clientSchema.safeParse(data.client); return r.success ? {} : flattenIssues(r.error); }
  if (step === 2) { const out: Record<string, string> = {}; data.farms.forEach((f, i) => { const r = farmSchema.safeParse(f); if (!r.success) for (const [k, v] of Object.entries(flattenIssues(r.error))) out[`farms.${i}.${k}`] = v; }); return out; }
  if (step === 3) { const out: Record<string, string> = {}; data.plots.forEach((p, i) => { const r = plotSchema.safeParse(p); if (!r.success) for (const [k, v] of Object.entries(flattenIssues(r.error))) out[`plots.${i}.${k}`] = v; }); return { ...out, ...plotCrossErrors(data) }; }
  if (step === 4) { const r = teamSchema.safeParse(data.team); return r.success ? {} : flattenIssues(r.error); }
  const r = submitSchema.safeParse(data);
  if (r.success) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(flattenIssues(r.error))) out[k === "" ? "form" : k] = v;
  return out;
}

export function OnboardingWizard({ serverDraft }: { serverDraft: ServerDraftProp }) {
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
        if (serverDraft) merged.idempotencyKey = serverDraft.idempotencyKey;
        setData(merged);
        if (local.draftId && !serverDraft) setDraftId(local.draftId);
        setNotice(`Draft recovered from ${new Date(localTime).toLocaleString()}.`);
      }
    };
    applyLocal(loadLocal(serverDraft?.id ?? null) ?? (serverDraft ? null : loadLocal(null)));
    const on = () => { setOnline(true); setNotice(null); };
    const off = () => { setOnline(false); setNotice("Offline — saving on this device."); };
    window.addEventListener("online", on); window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (result) return;
    const t = setTimeout(() => saveLocal(draftIdRef.current, { draftId: draftIdRef.current, idempotencyKey: dataRef.current.idempotencyKey, updatedAt: new Date().toISOString(), data: dataRef.current }), 600);
    return () => clearTimeout(t);
  }, [data, draftId, result]);

  useEffect(() => {
    if (result || !online) return;
    const t = setTimeout(() => {
      const snap = dataRef.current;
      if (!snap.client.name.trim() && snap.farms.length === 0) return;
      setSaveState("saving");
      fetch("/api/hq/onboarding/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: draftIdRef.current, idempotencyKey: snap.idempotencyKey, payload: snap, clientName: snap.client.name.trim() || null, farmCount: snap.farms.length }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { if (!d?.id) { setSaveState("error"); return; } if (!draftIdRef.current) setDraftId(d.id); setSavedAt(d.updatedAt); setSaveState("saved"); })
        .catch(() => setSaveState("error"));
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
    const errs = validateStep(5, data);
    if (Object.keys(errs).length) {
      setErrors(errs); setSubmitError(null);
      if (errs["client.name"] || Object.keys(errs).some((k) => k.startsWith("client.")) || asyncIssue) setStep(1);
      else if (Object.keys(errs).some((k) => k.startsWith("farms."))) setStep(2);
      else if (Object.keys(errs).some((k) => k.startsWith("plots."))) setStep(3);
      else if (Object.keys(errs).some((k) => k.startsWith("team."))) setStep(4);
      return;
    }
    if (asyncIssue) { setStep(1); return; }
    setSubmitting(true); setSubmitError(null);
    try {
      const res = await fetch("/api/hq/onboarding/submit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) { setSubmitError(body.error ?? "Activation failed. Draft is safe — fix and retry."); return; }
      setResult(body as ActivationResult);
      clearLocal(draftIdRef.current);
      if (body.deduped) toast.show("Duplicate submit — original activation shown.", "info");
      else toast.show("Client activated.", "success");
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

  // ── SUCCESS ──────────────────────────────────────────────────────────────
  if (result) {
    const showSheet = data.team.mode === "create" && result.credential.status === "ACTIVE" && !result.deduped;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--green-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icons.CheckCircle size={22} style={{ color: "#fff" }} />
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{result.deduped ? "Already activated" : "Client activated"}</div>
            <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 2 }}>ID: <strong>{result.client.code}</strong></div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <tbody>
            {[
              { label: "Client", value: result.client.name },
              { label: `Farms (${result.farms.length})`, value: result.farms.map((f) => f.name).join(", ") || "None" },
              { label: `Plots (${result.plots.length})`, value: result.plots.map((p) => p.name).join(", ") || "None" },
              { label: "Credentials", value: result.credential.status === "ACTIVE" ? `Login → ${result.credential.loginEmail}` : "Pending invite" },
            ].map((r) => (
              <tr key={r.label} style={{ borderBottom: "1px solid var(--hairline)" }}>
                <td style={{ padding: "8px 0", color: "var(--muted)", width: 140, verticalAlign: "top" }}>{r.label}</td>
                <td style={{ padding: "8px 0" }}>{r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {showSheet && (
          <div style={{ padding: "14px 16px", border: "1px solid var(--amber)", borderRadius: "var(--radius-md)", background: "var(--amber-light)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--amber)", marginBottom: 10 }}>⚠ Show-once credentials — read to client now</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <tbody>
                {[
                  { label: "Email", value: result.credential.loginEmail },
                  { label: "Password", value: data.team.password, mono: true },
                  { label: "Page", value: result.credential.loginUrl },
                ].map((r) => (
                  <tr key={r.label}>
                    <td style={{ padding: "4px 0", color: "var(--amber)", width: 80, verticalAlign: "top" }}>{r.label}</td>
                    <td style={{ padding: "4px 0", fontFamily: r.mono ? "monospace" : undefined }}>{r.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => { const t = `Login: ${result.credential.loginEmail}\nPassword: ${data.team.password}\nPage: ${result.credential.loginUrl}`; navigator.clipboard?.writeText(t).then(() => toast.show("Copied.", "success"), () => toast.show("Copy failed.", "error")); }}>
                <Icons.Copy size={13} /><span>Copy</span>
              </button>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => setData((d) => ({ ...d, team: { ...d.team, password: "", confirmPassword: "" } }))}>
                <Icons.Eye size={13} /><span>Dismiss</span>
              </button>
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <Link className="btn btn-secondary" href="/hq/onboarding">Back to list</Link>
          <Link className="btn btn-green" href="/hq/onboarding/new">Onboard another</Link>
        </div>
      </div>
    );
  }

  // ── WIZARD ───────────────────────────────────────────────────────────────
  const saveLabel = !online ? "Offline" : saveState === "saving" ? "Saving…" : saveState === "saved" && savedAt ? `Saved ${new Date(savedAt).toLocaleTimeString()}` : saveState === "error" ? "Save failed" : "";

  return (
    <>
      <style>{`
        .ob-wrap { display: grid; grid-template-columns: 200px 1fr; gap: 32px; align-items: start; }
        .ob-rail { position: sticky; top: 64px; }
        @media (max-width: 700px) {
          .ob-wrap { grid-template-columns: 1fr; gap: 0; }
          .ob-rail { position: static; display: flex; overflow-x: auto; border-bottom: 1px solid var(--hairline); padding-bottom: 0; margin-bottom: 20px; }
          .ob-rail-item { min-width: 80px; flex-direction: column !important; padding: 10px 12px !important; border-left: none !important; border-bottom: 2px solid transparent; text-align: center; }
          .ob-rail-item[aria-current="step"] { border-bottom-color: var(--ink) !important; }
          .ob-rail-desc, .ob-rail-foot { display: none !important; }
        }
      `}</style>

      {/* Alerts */}
      {(notice || Object.keys(errors).length > 0) && (
        <div style={{ marginBottom: 16, display: "flex", flexDirection: "column", gap: 8 }}>
          {notice && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--muted)" }}>
              <Icons.Refresh size={13} style={{ flexShrink: 0 }} />{notice}
            </div>
          )}
          {Object.keys(errors).length > 0 && (
            <div role="alert" style={{ fontSize: 12, color: "var(--semantic-error)", fontWeight: 600 }}>
              {Object.keys(errors).length} issue{Object.keys(errors).length > 1 ? "s" : ""} to fix
            </div>
          )}
        </div>
      )}

      <div className="ob-wrap">

        {/* ── RAIL ─────────────────────────────────────────────────────── */}
        <nav className="ob-rail" aria-label="Steps">
          {STEPS.map((s, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            const locked = n > maxVisited;
            return (
              <button
                key={s.label}
                type="button"
                className="ob-rail-item"
                aria-current={active ? "step" : undefined}
                onClick={() => !locked && goStep(n)}
                disabled={locked}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "9px 0", background: "none", border: "none",
                  borderLeft: active ? "2px solid var(--ink)" : "2px solid transparent",
                  paddingLeft: active ? 10 : 12,
                  cursor: locked ? "not-allowed" : "pointer",
                  opacity: locked ? 0.38 : 1,
                  textAlign: "left",
                  transition: "border-color 0.1s",
                }}
              >
                <div style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, flexShrink: 0, background: done ? "var(--ink)" : active ? "transparent" : "transparent", border: done ? "none" : active ? "2px solid var(--ink)" : "1.5px solid var(--hairline-strong)", color: done ? "#fff" : active ? "var(--ink)" : "var(--muted)" }}>
                  {done ? <Icons.Check size={11} /> : n}
                </div>
                <div style={{ overflow: "hidden", minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? "var(--ink)" : done ? "var(--body-strong)" : "var(--muted)", whiteSpace: "nowrap" }}>{s.label}</div>
                </div>
              </button>
            );
          })}

          {/* Save status & discard */}
          <div className="ob-rail-foot" style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: 8 }}>
            {saveLabel && <div style={{ fontSize: 11, color: "var(--muted-soft)" }}>{saveLabel}</div>}
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--muted)", justifyContent: "flex-start" }} onClick={discard} disabled={discarding}>
              <Icons.Trash size={12} /><span>{discarding ? "Discarding…" : "Discard draft"}</span>
            </button>
          </div>
        </nav>

        {/* ── CONTENT ──────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20, minWidth: 0 }}>
          {/* Step title */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.06em", textTransform: "uppercase" as const }}>Step {step} / {STEPS.length}</span>
              <h2 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>{STEPS[step - 1].label}</h2>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" style={{ color: "var(--muted)" }} onClick={discard} disabled={discarding}>
              <Icons.Trash size={12} /><span>Discard draft</span>
            </button>
          </div>

          {/* Step content — flat, no outer card */}
          {step === 1 && <OnboardingStepClient value={data.client} onChange={(client) => setData((d) => ({ ...d, client }))} errors={errors} idempotencyKey={data.idempotencyKey} asyncIssue={asyncIssue} onAsyncIssue={setAsyncIssue} />}
          {step === 2 && <OnboardingStepFarms value={data.farms} onChange={(farms) => setData((d) => ({ ...d, farms }))} errors={errors} />}
          {step === 3 && <OnboardingStepPlots plots={data.plots} farms={data.farms} onChange={(plots) => setData((d) => ({ ...d, plots }))} errors={errors} />}
          {step === 4 && <OnboardingStepTeam value={data.team} onChange={(team) => setData((d) => ({ ...d, team }))} errors={errors} clientName={data.client.name} clientEmail={data.client.email ?? ""} />}
          {step === 5 && <OnboardingStepReview data={data} submitting={submitting} submitError={submitError} onActivate={activate} />}

          {/* Nav */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid var(--hairline)" }}>
            <button type="button" className="btn btn-secondary" onClick={() => goStep(step - 1)} disabled={step === 1}>
              <Icons.ArrowLeft size={14} /><span>Back</span>
            </button>
            {step < 5 ? (
              <button type="button" className="btn btn-primary" onClick={() => goStep(step + 1)} disabled={step === 1 && !!asyncIssue}>
                <span>Continue</span><Icons.ArrowRight size={14} />
              </button>
            ) : (
              <button type="button" className="btn btn-green btn-lg" onClick={activate} disabled={submitting}>
                <span>{submitting ? "Activating…" : "Activate client"}</span><Icons.ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
