"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import {
  clientSchema,
  farmSchema,
  flattenIssues,
  newIdempotencyKey,
  plotSchema,
  submitSchema,
  teamSchema,
  type WizardData,
} from "./onboarding-schema";
import { clearLocal, hydrate, loadLocal, saveLocal, type StoredDraft } from "./onboarding-draft";
import { OnboardingStepClient } from "./onboarding-step-client";
import { OnboardingStepFarms } from "./onboarding-step-farms";
import { OnboardingStepPlots } from "./onboarding-step-plots";
import { OnboardingStepTeam } from "./onboarding-step-team";
import { OnboardingStepReview, type ActivationResult } from "./onboarding-step-review";

export type ServerDraftProp = {
  id: string;
  idempotencyKey: string;
  payload: Partial<WizardData>;
  updatedAt: string;
} | null;

const STEPS = ["Client info", "Farms", "Plots", "Team", "Review"];

/** Cross-plot checks that need farm context (dup names per farm, area caps, orphan refs). */
function plotCrossErrors(data: WizardData): Record<string, string> {
  const out: Record<string, string> = {};
  const farmByRow = new Map(data.farms.map((f, i) => [f.rowId ?? `index:${i}`, { farm: f, index: i }]));
  const seen = new Map<string, number>();
  data.plots.forEach((p, i) => {
    const holder = farmByRow.get(p.farmRowId);
    if (!holder) {
      out[`plots.${i}.farmRowId`] = "Plot refers to a farm that no longer exists.";
      return;
    }
    const key = `${p.farmRowId}::${p.name.trim().toLowerCase()}`;
    const first = seen.get(key);
    if (first !== undefined) out[`plots.${i}.name`] = `Duplicate of plot row ${first + 1} on the same farm.`;
    else seen.set(key, i);
    const cap = Number(holder.farm.cultivableArea);
    if (Number.isFinite(cap) && cap > 0 && Number(p.area) > cap) {
      out[`plots.${i}.area`] = "Plot area exceeds its farm's cultivable area.";
    }
  });
  return out;
}

function validateStep(step: number, data: WizardData): Record<string, string> {
  if (step === 1) {
    const r = clientSchema.safeParse(data.client);
    return r.success ? {} : flattenIssues(r.error);
  }
  if (step === 2) {
    const out: Record<string, string> = {};
    data.farms.forEach((f, i) => {
      const r = farmSchema.safeParse(f);
      if (!r.success) {
        for (const [k, v] of Object.entries(flattenIssues(r.error))) out[`farms.${i}.${k}`] = v;
      }
    });
    return out;
  }
  if (step === 3) {
    const out: Record<string, string> = {};
    data.plots.forEach((p, i) => {
      const r = plotSchema.safeParse(p);
      if (!r.success) {
        for (const [k, v] of Object.entries(flattenIssues(r.error))) out[`plots.${i}.${k}`] = v;
      }
    });
    return { ...out, ...plotCrossErrors(data) };
  }
  if (step === 4) {
    const r = teamSchema.safeParse(data.team);
    return r.success ? {} : flattenIssues(r.error);
  }
  const r = submitSchema.safeParse(data);
  if (r.success) return {};
  const flat = flattenIssues(r.error);
  // Remap top-level cross issues onto step shapes where possible.
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (k === "") out["form"] = v;
    else out[k] = v;
  }
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
  const dataRef = useRef(data);
  dataRef.current = data;
  const draftIdRef = useRef(draftId);
  draftIdRef.current = draftId;

  // Mount: merge the offline safety net, then track connectivity.
  useEffect(() => {
    const applyLocal = (local: StoredDraft | null) => {
      if (!local) {
        if (!navigator.onLine) setNotice("You are offline. Changes save on this device until you reconnect.");
        return;
      }
      const serverTime = serverDraft ? Date.parse(serverDraft.updatedAt) : 0;
      const localTime = Date.parse(local.updatedAt);
      if (!serverDraft || localTime > serverTime) {
        const merged = hydrate(local.data, serverDraft?.idempotencyKey ?? local.idempotencyKey);
        if (serverDraft) merged.idempotencyKey = serverDraft.idempotencyKey;
        setData(merged);
        if (local.draftId && !serverDraft) setDraftId(local.draftId);
        setNotice(`Recovered unsent draft from ${new Date(localTime).toLocaleString()}. Nothing was lost.`);
      }
    };
    // New-mode key holds the draftId once the first server save lands.
    applyLocal(loadLocal(serverDraft?.id ?? null) ?? (serverDraft ? null : loadLocal(null)));
    const onOnline = () => {
      setOnline(true);
      setNotice(null);
    };
    const onOffline = () => {
      setOnline(false);
      setNotice("You are offline. Changes save on this device and sync when you reconnect.");
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local snapshot on every change (the refresh-proof layer).
  useEffect(() => {
    if (result) return;
    const timer = setTimeout(() => {
      saveLocal(draftIdRef.current, {
        draftId: draftIdRef.current,
        idempotencyKey: dataRef.current.idempotencyKey,
        updatedAt: new Date().toISOString(),
        data: dataRef.current,
      });
    }, 600);
    return () => clearTimeout(timer);
  }, [data, draftId, result]);

  // Server draft sync (the cross-device layer). Skipped offline.
  useEffect(() => {
    if (result || !online) return;
    const timer = setTimeout(() => {
      const snapshot = dataRef.current;
      if (!snapshot.client.name.trim() && snapshot.farms.length === 0) return;
      setSaveState("saving");
      fetch("/api/hq/onboarding/drafts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draftIdRef.current,
          idempotencyKey: snapshot.idempotencyKey,
          payload: snapshot,
          clientName: snapshot.client.name.trim() || null,
          farmCount: snapshot.farms.length,
        }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d?.id) {
            setSaveState("error");
            return;
          }
          if (!draftIdRef.current) setDraftId(d.id);
          setSavedAt(d.updatedAt);
          setSaveState("saved");
        })
        .catch(() => setSaveState("error"));
    }, 2500);
    return () => clearTimeout(timer);
  }, [data, draftId, online, result]);

  const goStep = (next: number) => {
    if (next > step) {
      const errs = validateStep(step, data);
      if (Object.keys(errs).length > 0) {
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
    const errs = validateStep(5, data);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setSubmitError(null);
      if (errs["client.name"] || Object.keys(errs).some((k) => k.startsWith("client.")) || asyncIssue) setStep(1);
      else if (Object.keys(errs).some((k) => k.startsWith("farms."))) setStep(2);
      else if (Object.keys(errs).some((k) => k.startsWith("plots."))) setStep(3);
      else if (Object.keys(errs).some((k) => k.startsWith("team."))) setStep(4);
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
        setSubmitError(body.error ?? "Activation failed. Your draft is safe — fix the issue and retry.");
        return;
      }
      setResult(body as ActivationResult);
      clearLocal(draftIdRef.current);
      if (body.deduped) toast.show("Duplicate submit ignored — showing the original activation.", "info");
      else toast.show("Client activated.", "success");
    } catch {
      setSubmitError("Network error. Your draft is safe — retry when connected.");
    } finally {
      setSubmitting(false);
    }
  };

  const discard = async () => {
    if (!window.confirm("Discard this onboarding draft? This cannot be undone.")) return;
    setDiscarding(true);
    try {
      if (draftIdRef.current) {
        await fetch(`/api/hq/onboarding/drafts/${draftIdRef.current}`, { method: "DELETE" }).catch(() => undefined);
      }
      clearLocal(draftIdRef.current);
      if (!draftIdRef.current) clearLocal(null);
      router.push("/hq/onboarding");
    } finally {
      setDiscarding(false);
    }
  };

  if (result) {
    const showSheet = data.team.mode === "create" && result.credential.status === "ACTIVE" && !result.deduped;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="success-banner" role="status">
          <Icons.CheckCircle size={16} />
          <span>
            {result.deduped ? "Duplicate submit ignored — original activation shown." : "Client activated."} Client ID {result.client.code}.
          </span>
        </div>
        <div className="section-block">
          <div className="form-section-title">Activation summary</div>
          <dl style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "6px 12px", fontSize: 13, margin: 0 }}>
            <dt className="muted">Client ID</dt>
            <dd style={{ margin: 0 }}>{result.client.code} ({result.client.id})</dd>
            <dt className="muted">Farms ({result.farms.length})</dt>
            <dd style={{ margin: 0 }}>{result.farms.length === 0 ? "None" : result.farms.map((f) => `${f.name} (${f.id})`).join(", ")}</dd>
            <dt className="muted">Plots ({result.plots.length})</dt>
            <dd style={{ margin: 0 }}>{result.plots.length === 0 ? "None" : result.plots.map((p) => `${p.name} (${p.id})`).join(", ")}</dd>
            <dt className="muted">Credentials</dt>
            <dd style={{ margin: 0 }}>{result.credential.status === "ACTIVE" ? `Login created for ${result.credential.loginEmail}` : "Pending — invite later"}</dd>
          </dl>
        </div>
        {showSheet && (
          <div className="section-block" style={{ borderColor: "var(--amber)" }}>
            <div className="form-section-title">Show-once credential sheet</div>
            <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
              Read these to the client now. Dismissing clears the password from this screen.
            </p>
            <dl style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: "6px 12px", fontSize: 13, margin: 0 }}>
              <dt className="muted">Login email</dt>
              <dd style={{ margin: 0 }}>{result.credential.loginEmail}</dd>
              <dt className="muted">Password</dt>
              <dd style={{ margin: 0, fontFamily: "monospace" }}>{data.team.password}</dd>
              <dt className="muted">Login page</dt>
              <dd style={{ margin: 0 }}>{result.credential.loginUrl}</dd>
            </dl>
            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  const text = `Login: ${result.credential.loginEmail}\nPassword: ${data.team.password}\nPage: ${result.credential.loginUrl}`;
                  navigator.clipboard?.writeText(text).then(
                    () => toast.show("Credentials copied.", "success"),
                    () => toast.show("Copy failed — read them out instead.", "error")
                  );
                }}
              >
                <Icons.Copy size={14} />
                <span>Copy credentials</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setData((d) => ({ ...d, team: { ...d.team, password: "", confirmPassword: "" } }))}
              >
                <Icons.Eye size={14} />
                <span>Dismiss sheet</span>
              </button>
            </div>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link className="btn btn-secondary" href="/hq/onboarding">
            Back to resume list
          </Link>
          <Link className="btn btn-green" href="/hq/onboarding/new">
            Start another onboarding
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <ol
        aria-label="Onboarding progress"
        style={{ display: "flex", gap: 4, listStyle: "none", margin: 0, padding: 0, flexWrap: "wrap" }}
      >
        {STEPS.map((label, i) => {
          const n = i + 1;
          const active = n === step;
          const done = n < step || n <= maxVisited;
          return (
            <li key={label} style={{ flex: "1 1 120px" }}>
              <button
                type="button"
                onClick={() => n <= maxVisited && goStep(n)}
                disabled={n > maxVisited}
                aria-current={active ? "step" : undefined}
                style={{
                  width: "100%",
                  textAlign: "left",
                  border: `1px solid ${active ? "var(--ink)" : "var(--hairline)"}`,
                  background: active ? "var(--ink)" : "var(--surface-card)",
                  color: active ? "var(--surface-card)" : "var(--ink)",
                  padding: "8px 10px",
                  cursor: n <= maxVisited ? "pointer" : "not-allowed",
                  opacity: n <= maxVisited ? 1 : 0.55,
                  fontSize: 13,
                  fontWeight: active ? 700 : 500,
                }}
              >
                {n}. {label}
                {done && n !== step ? " ✓" : ""}
              </button>
            </li>
          );
        })}
      </ol>

      <div className="muted" style={{ fontSize: 12, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <span>
          {!online
            ? "Offline — saving on this device"
            : saveState === "saving"
              ? "Saving draft…"
              : saveState === "saved" && savedAt
                ? `Draft saved ${new Date(savedAt).toLocaleTimeString()}`
                : saveState === "error"
                  ? "Server save failed — kept on this device"
                  : "Draft keeps on this device as you type"}
        </span>
        <span style={{ marginLeft: "auto" }} />
        <button type="button" className="btn btn-secondary btn-sm" onClick={discard} disabled={discarding}>
          <Icons.Trash size={13} />
          <span>{discarding ? "Discarding…" : "Discard draft"}</span>
        </button>
      </div>

      {notice && (
        <div className="success-banner" role="status">
          <Icons.Refresh size={15} />
          <span>{notice}</span>
        </div>
      )}

      {step === 1 && (
        <OnboardingStepClient
          value={data.client}
          onChange={(client) => setData((d) => ({ ...d, client }))}
          errors={errors}
          idempotencyKey={data.idempotencyKey}
          asyncIssue={asyncIssue}
          onAsyncIssue={setAsyncIssue}
        />
      )}
      {step === 2 && <OnboardingStepFarms value={data.farms} onChange={(farms) => setData((d) => ({ ...d, farms }))} errors={errors} />}
      {step === 3 && (
        <OnboardingStepPlots plots={data.plots} farms={data.farms} onChange={(plots) => setData((d) => ({ ...d, plots }))} errors={errors} />
      )}
      {step === 4 && (
        <OnboardingStepTeam
          value={data.team}
          onChange={(team) => setData((d) => ({ ...d, team }))}
          errors={errors}
          clientName={data.client.name}
          clientEmail={data.client.email ?? ""}
        />
      )}
      {step === 5 && <OnboardingStepReview data={data} submitting={submitting} submitError={submitError} onActivate={activate} />}

      {step < 5 && (
        <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          <button type="button" className="btn btn-secondary" onClick={() => goStep(step - 1)} disabled={step === 1}>
            <Icons.ArrowLeft size={15} />
            <span>Back</span>
          </button>
          <button type="button" className="btn btn-green" onClick={() => goStep(step + 1)} disabled={step === 1 && !!asyncIssue}>
            <span>Save and continue</span>
            <Icons.ArrowRight size={15} />
          </button>
        </div>
      )}
      {step === 5 && (
        <div style={{ display: "flex", justifyContent: "flex-start", paddingTop: 4 }}>
          <button type="button" className="btn btn-secondary" onClick={() => goStep(4)}>
            <Icons.ArrowLeft size={15} />
            <span>Back</span>
          </button>
        </div>
      )}
    </div>
  );
}
