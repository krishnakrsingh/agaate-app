"use client";
import { useState, useEffect, FormEvent, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

type Agronomist = {
  id: string;
  name: string;
  email: string;
};

type HandoverData = {
  estateName: string;
  clientName: string;
  clientEmail: string;
  initialPassword: string;
  loginUrl: string;
  farmId: string;
};

type FormState = {
  farmName: string;
  location: string;
  address: string;
  waterSource: string;
  totalArea: string;
  cultivableArea: string;
  latitude: string;
  longitude: string;
  geofenceRadius: string;
  ownerName: string;
  ownerEmail: string;
  ownerPassword: string;
  agronomistId: string;
  initialPlotName: string;
  initialPlotArea: string;
  initialIrrigationType: string;
};

const DRAFT_KEY = "agaate_onboard_draft";

const STEPS = [
  { id: "estate", label: "Estate Basics" },
  { id: "land", label: "Land & Location" },
  { id: "owner", label: "Owner Access" },
  { id: "agronomy", label: "Team & First Plot" },
  { id: "review", label: "Review & Provision" },
];

const STEP_META = [
  {
    eyebrow: "ESTATE IDENTITY",
    title: "Let's start with the basics",
    subtitle:
      "Tell us about the property you're onboarding. These details can be refined later from the estate console.",
  },
  {
    eyebrow: "LAND & LOCATION",
    title: "How much land are we working with?",
    subtitle:
      "We use this to power field presence checks, area planning, and agronomy recommendations. The GPS pin can be captured automatically.",
  },
  {
    eyebrow: "CLIENT OWNER ACCESS",
    title: "Who will run this estate?",
    subtitle:
      "This person becomes the Farm Owner and signs in with these credentials. You'll hand them the keys once provisioning is complete.",
  },
  {
    eyebrow: "TEAM & FIRST PLOT",
    title: "Set up the team & first plot",
    subtitle:
      "Optional but recommended — assign a dedicated agronomist and demarcate the first plot so agronomy work can begin immediately.",
  },
  {
    eyebrow: "FINAL REVIEW",
    title: "Everything look right?",
    subtitle:
      "Review the details below, then provision the estate. Owner credentials will be issued in the handover voucher.",
  },
];

const emptyForm: FormState = {
  farmName: "",
  location: "",
  address: "",
  waterSource: "",
  totalArea: "",
  cultivableArea: "",
  latitude: "",
  longitude: "",
  geofenceRadius: "500",
  ownerName: "",
  ownerEmail: "",
  ownerPassword: "",
  agronomistId: "",
  initialPlotName: "",
  initialPlotArea: "",
  initialIrrigationType: "Drip",
};

function validateStep(step: number, f: FormState): Record<string, string> {
  const e: Record<string, string> = {};

  if (step === 0) {
    if (!f.farmName.trim() || f.farmName.trim().length < 2) {
      e.farmName = "Give the estate a name (at least 2 characters).";
    }
    if (!f.location.trim() || f.location.trim().length < 2) {
      e.location = "Add a region so field teams can locate the estate.";
    }
  }

  if (step === 1) {
    const total = Number(f.totalArea);
    const cultivable = Number(f.cultivableArea);
    const lat = Number(f.latitude);
    const lng = Number(f.longitude);
    const radius = Number(f.geofenceRadius);

    if (!f.totalArea || isNaN(total) || total <= 0) {
      e.totalArea = "Enter the total estate acreage.";
    }
    if (!f.cultivableArea || isNaN(cultivable) || cultivable <= 0) {
      e.cultivableArea = "Enter the cultivable acreage.";
    }
    if (cultivable > total) {
      e.cultivableArea = "Cultivable area can't exceed the total estate acreage.";
    }
    if (f.latitude === "" || isNaN(lat) || lat < -90 || lat > 90) {
      e.latitude = "Latitude must be between -90 and 90.";
    }
    if (f.longitude === "" || isNaN(lng) || lng < -180 || lng > 180) {
      e.longitude = "Longitude must be between -180 and 180.";
    }
    if (f.geofenceRadius === "" || isNaN(radius) || radius < 100 || radius > 5000) {
      e.geofenceRadius = "Use a radius between 100 and 5,000 metres.";
    }
  }

  if (step === 2) {
    if (!f.ownerName.trim() || f.ownerName.trim().length < 2) {
      e.ownerName = "Enter the client's full name.";
    }
    if (!f.ownerEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.ownerEmail.trim())) {
      e.ownerEmail = "Enter a valid email address.";
    }
    if (!f.ownerPassword || f.ownerPassword.length < 8) {
      e.ownerPassword = "Use at least 8 characters for the temporary password.";
    }
  }

  if (step === 3) {
    const hasName = Boolean(f.initialPlotName.trim());
    const hasArea = Boolean(f.initialPlotArea.trim());
    if (hasName !== hasArea) {
      e.initialPlotName = "Add both a name and an area for the initial plot, or leave both empty.";
    }
    if (hasArea) {
      const area = Number(f.initialPlotArea);
      const cultivable = Number(f.cultivableArea);
      if (isNaN(area) || area <= 0) {
        e.initialPlotArea = "Enter a valid plot area.";
      } else if (cultivable && area > cultivable) {
        e.initialPlotArea = "Plot area can't exceed the cultivable acreage.";
      }
    }
  }

  return e;
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: ReactNode;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="onboarding-field">
      <label className="ob-label" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && <div className="ob-helper">{hint}</div>}
      {error && (
        <div className="field-error" role="alert">
          <Icons.AlertCircle size={12} /> {error}
        </div>
      )}
    </div>
  );
}

export function ClientOnboardingWizard({
  agronomists = [],
}: {
  agronomists: Agronomist[];
}) {
  const router = useRouter();
  const toast = useToast();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState(0);
  const [maxStep, setMaxStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [handover, setHandover] = useState<HandoverData | null>(null);
  const [draftInfo, setDraftInfo] = useState<{ savedAt: number } | null>(null);

  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    const restore = () => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d && d.form) {
          setForm((prev) => ({ ...prev, ...d.form }));
          setDraftInfo({ savedAt: d.savedAt || Date.now() });
        }
      } catch {
        // ignore malformed drafts
      }
    };
    const id = requestAnimationFrame(restore);
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  function update<K extends keyof FormState>(name: K, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  function focusField(name: string) {
    requestAnimationFrame(() => {
      document.getElementById(`ob-${name}`)?.focus();
    });
  }

  function jumpTo(i: number) {
    if (i > maxStep) return;
    setErrors({});
    setStep(i);
  }

  function goBack() {
    if (step === 0) return;
    setErrors({});
    setStep((s) => s - 1);
  }

  function handleNext(e: FormEvent) {
    e.preventDefault();
    if (isLast) {
      void submit();
      return;
    }
    const errs = validateStep(step, form);
    if (Object.keys(errs).length) {
      setErrors(errs);
      focusField(Object.keys(errs)[0]);
      return;
    }
    setErrors({});
    const next = step + 1;
    setStep(next);
    setMaxStep((m) => Math.max(m, next));
  }

  function saveAndExit() {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ form, savedAt: Date.now() }));
    } catch {
      // storage unavailable — just exit
    }
    toast.success("Progress saved — you can resume anytime.");
    router.push("/dashboard");
  }

  function discardDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ignore
    }
    setDraftInfo(null);
    setForm(emptyForm);
    setErrors({});
  }

  function generatePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    update("ownerPassword", pass);
  }

  function captureGps() {
    if (!navigator.geolocation) {
      toast.error("Geolocation isn't supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        update("latitude", pos.coords.latitude.toFixed(6));
        update("longitude", pos.coords.longitude.toFixed(6));
        toast.success("Current GPS position captured.");
      },
      () => {
        toast.error("Couldn't capture GPS. Enter coordinates manually.");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }

  async function submit() {
    setPending(true);
    try {
      const body = {
        farmName: form.farmName.trim(),
        location: form.location.trim(),
        address: form.address.trim() || undefined,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        totalArea: Number(form.totalArea),
        cultivableArea: Number(form.cultivableArea),
        waterSource: form.waterSource.trim() || undefined,
        geofenceRadiusMeters: Number(form.geofenceRadius || 500),
        ownerName: form.ownerName.trim(),
        ownerEmail: form.ownerEmail.trim().toLowerCase(),
        ownerPassword: form.ownerPassword,
        agronomistId: form.agronomistId || null,
        initialPlotName: form.initialPlotName.trim() || null,
        initialPlotArea: form.initialPlotArea ? Number(form.initialPlotArea) : null,
        initialIrrigationType: form.initialIrrigationType,
      };

      const res = await fetch("/api/admin/onboard-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || data.error || "Provisioning failed. Check the details and try again.");
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        // ignore
      }

      setHandover({
        ...data.handover,
        farmId: data.farm.id,
      });
      toast.success("Estate provisioned — client credentials issued!");
    } catch (err: any) {
      toast.error(err.message || "Provisioning failed.");
    } finally {
      setPending(false);
    }
  }

  const copyHandoverText = () => {
    if (!handover) return;
    const text = `🌿 *WELCOME TO AGAATE PRECISION AGROTECH*
Dear ${handover.clientName},

Your estate *${handover.estateName}* has been officially provisioned on the Agaate platform. You can now log in as the Farm Owner (Farm Admin) to track real-time crop growth, harvest yields, daily labour muster, and financial burn rate.

━━━━━━━━━━━━━━━━━━━━
🔑 *YOUR LOGIN CREDENTIALS*
• Login URL: ${window.location.origin}/login
• Username: *${handover.clientEmail}*
• Temporary Password: *${handover.initialPassword}*

━━━━━━━━━━━━━━━━━━━━
📱 *NEXT STEPS*
1. Log in to your Owner Cockpit at the link above.
2. Employ your on-site farm manager (Farm Officer) from the Workforce tab.
3. Your assigned Agaate Agronomist will begin issuing precision crop prescriptions.

Welcome aboard!`;

    navigator.clipboard.writeText(text);
    toast.success("Client Handover Card copied to clipboard!");
  };

  if (handover) {
    return (
      <div className="onboarding-handover">
        <div className="onboarding-handover-head">
          <div className="ob-handover-icon">
            <Icons.CheckCircle size={28} />
          </div>
          <h2>Estate provisioned successfully!</h2>
          <p>
            The farm is active, the first plot is demarcated, and client owner credentials are live.
          </p>
        </div>

        <div className="onboarding-handover-card">
          <div className="handover-title">
            <span>Client Handover Voucher</span>
            <span className="badge badge-green">Ready to Share</span>
          </div>
          <div className="handover-grid">
            <div>
              <span>Estate Name</span>
              <strong>{handover.estateName}</strong>
            </div>
            <div>
              <span>Client Owner</span>
              <strong>{handover.clientName}</strong>
            </div>
            <div>
              <span>Login Email</span>
              <strong>{handover.clientEmail}</strong>
            </div>
            <div>
              <span>Initial Password</span>
              <strong>{handover.initialPassword}</strong>
            </div>
          </div>
        </div>

        <div className="onboarding-handover-actions">
          <button type="button" className="btn btn-secondary" onClick={copyHandoverText}>
            <Icons.ClipboardList size={15} />
            <span>Copy for WhatsApp / Email</span>
          </button>
          <Link href={`/farms/${handover.farmId}`} className="btn btn-green">
            <span>Manage Estate</span>
            <Icons.ArrowRight size={15} />
          </Link>
          <Link href="/dashboard" className="btn btn-ghost">
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  const agronomistName =
    agronomists.find((a) => a.id === form.agronomistId)?.name || "Assign later";

  const reviewRows = [
    {
      section: "Estate",
      items: [
        { label: "Name", value: form.farmName || "—" },
        { label: "Region", value: form.location || "—" },
        { label: "Water source", value: form.waterSource || "—" },
        { label: "Address", value: form.address || "—" },
      ],
    },
    {
      section: "Land & location",
      items: [
        { label: "Total area", value: form.totalArea ? `${form.totalArea} acres` : "—" },
        { label: "Cultivable", value: form.cultivableArea ? `${form.cultivableArea} acres` : "—" },
        { label: "Coordinates", value: form.latitude && form.longitude ? `${form.latitude}, ${form.longitude}` : "—" },
        { label: "Presence radius", value: form.geofenceRadius ? `${form.geofenceRadius} m` : "—" },
      ],
    },
    {
      section: "Owner access",
      items: [
        { label: "Owner", value: form.ownerName || "—" },
        { label: "Login email", value: form.ownerEmail || "—" },
        { label: "Temporary password", value: form.ownerPassword || "—" },
      ],
    },
    {
      section: "Team & first plot",
      items: [
        { label: "Agronomist", value: agronomistName },
        {
          label: "Initial plot",
          value:
            form.initialPlotName && form.initialPlotArea
              ? `${form.initialPlotName} · ${form.initialPlotArea} acres`
              : "Not set — add later",
        },
      ],
    },
  ];

  return (
    <div className="onboarding">
      {/* Top bar: save & exit · progress · spacer */}
      <div className="onboarding-topbar">
        <button type="button" className="btn btn-ghost btn-sm" onClick={saveAndExit}>
          <Icons.X size={14} />
          <span>Save and exit</span>
        </button>

        <div className="onboarding-progress-wrap">
          <div
            className="onboarding-progress"
            role="progressbar"
            aria-valuenow={step + 1}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-label="Onboarding progress"
          >
            {STEPS.map((s, i) => (
              <button
                key={s.id}
                type="button"
                className={`seg ${i < step ? "done" : i === step ? "current" : ""}`}
                onClick={() => jumpTo(i)}
                aria-label={`Go to step ${i + 1}: ${s.label}`}
                aria-current={i === step ? "step" : undefined}
                tabIndex={i <= maxStep ? 0 : -1}
                title={s.label}
              />
            ))}
          </div>
          <div className="onboarding-step-label">
            Step {step + 1} of {STEPS.length} &middot; {STEPS[step].label}
          </div>
        </div>

        <span className="onboarding-topbar-spacer" aria-hidden />
      </div>

      {draftInfo && (
        <div className="onboarding-draft-banner" role="status">
          <Icons.Refresh size={14} />
          <span>
            Resumed a saved draft from{" "}
            <strong>{new Date(draftInfo.savedAt).toLocaleDateString()}</strong>. Anything you save
            keeps it safe for later.
          </span>
          <button type="button" className="text-action" onClick={discardDraft}>
            Discard draft
          </button>
        </div>
      )}

      <form className="onboarding-form" onSubmit={handleNext} noValidate>
        <section className="onboarding-step" key={step}>
          <div className="onboarding-heading">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              <span>{STEP_META[step].eyebrow}</span>
            </div>
            <h2>{STEP_META[step].title}</h2>
            <p>{STEP_META[step].subtitle}</p>
          </div>

          {/* STEP 1 — Estate basics */}
          {step === 0 && (
            <div className="onboarding-fields">
              <Field
                id="ob-farmName"
                label="Estate name"
                hint="The property's official name in your portfolio."
                error={errors.farmName}
              >
                <input
                  id="ob-farmName"
                  type="text"
                  className={errors.farmName ? "invalid" : ""}
                  placeholder="e.g. Kaveri Green Agro Farms"
                  value={form.farmName}
                  onChange={(e) => update("farmName", e.target.value)}
                  autoFocus
                />
              </Field>

              <div className="two-column">
                <Field
                  id="ob-location"
                  label="Region"
                  hint="City or district helps field teams find the estate."
                  error={errors.location}
                >
                  <input
                    id="ob-location"
                    type="text"
                    className={errors.location ? "invalid" : ""}
                    placeholder="e.g. Mandya, Karnataka"
                    value={form.location}
                    onChange={(e) => update("location", e.target.value)}
                  />
                </Field>

                <Field
                  id="ob-waterSource"
                  label="Primary water source"
                  hint="e.g. Borewell, farm pond, canal — optional for now."
                >
                  <input
                    id="ob-waterSource"
                    type="text"
                    placeholder="e.g. Borewell (20 HP)"
                    value={form.waterSource}
                    onChange={(e) => update("waterSource", e.target.value)}
                  />
                </Field>
              </div>

              <Field
                id="ob-address"
                label="Full address / landmark"
                hint="Survey numbers and landmarks help your team locate the estate on the ground."
              >
                <textarea
                  id="ob-address"
                  rows={3}
                  placeholder="Survey No. 42/1, Denkanikottai Road…"
                  value={form.address}
                  onChange={(e) => update("address", e.target.value)}
                />
              </Field>
            </div>
          )}

          {/* STEP 2 — Land & location */}
          {step === 1 && (
            <div className="onboarding-fields">
              <div className="two-column">
                <Field
                  id="ob-totalArea"
                  label="Total land area"
                  hint="The full estate acreage."
                  error={errors.totalArea}
                >
                  <div className="ob-input-group">
                    <input
                      id="ob-totalArea"
                      type="number"
                      min="0.01"
                      step="0.01"
                      className={errors.totalArea ? "invalid" : ""}
                      placeholder="e.g. 10.0"
                      value={form.totalArea}
                      onChange={(e) => update("totalArea", e.target.value)}
                    />
                    <span className="ob-suffix">acres</span>
                  </div>
                </Field>

                <Field
                  id="ob-cultivableArea"
                  label="Cultivable area"
                  hint="Land that can actually be farmed."
                  error={errors.cultivableArea}
                >
                  <div className="ob-input-group">
                    <input
                      id="ob-cultivableArea"
                      type="number"
                      min="0.01"
                      step="0.01"
                      className={errors.cultivableArea ? "invalid" : ""}
                      placeholder="e.g. 8.5"
                      value={form.cultivableArea}
                      onChange={(e) => update("cultivableArea", e.target.value)}
                    />
                    <span className="ob-suffix">acres</span>
                  </div>
                </Field>
              </div>

              <div className="two-column">
                <Field id="ob-latitude" label="Latitude" error={errors.latitude}>
                  <input
                    id="ob-latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    className={errors.latitude ? "invalid" : ""}
                    placeholder="e.g. 12.5284"
                    value={form.latitude}
                    onChange={(e) => update("latitude", e.target.value)}
                  />
                </Field>

                <Field id="ob-longitude" label="Longitude" error={errors.longitude}>
                  <input
                    id="ob-longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    className={errors.longitude ? "invalid" : ""}
                    placeholder="e.g. 77.8341"
                    value={form.longitude}
                    onChange={(e) => update("longitude", e.target.value)}
                  />
                </Field>
              </div>

              <div className="onboarding-coords-actions">
                <button type="button" className="text-action" onClick={captureGps}>
                  <Icons.MapPin size={14} />
                  <span>Capture current GPS position</span>
                </button>
              </div>

              <Field
                id="ob-geofenceRadius"
                label="Presence radius"
                hint="How close an officer must be to the estate pin for a verified clock-in. Defaults to 500 metres."
                error={errors.geofenceRadius}
              >
                <div className="ob-input-group">
                  <input
                    id="ob-geofenceRadius"
                    type="number"
                    min="100"
                    max="5000"
                    step="50"
                    className={errors.geofenceRadius ? "invalid" : ""}
                    value={form.geofenceRadius}
                    onChange={(e) => update("geofenceRadius", e.target.value)}
                  />
                  <span className="ob-suffix">metres</span>
                </div>
              </Field>
            </div>
          )}

          {/* STEP 3 — Owner access */}
          {step === 2 && (
            <div className="onboarding-fields">
              <Field
                id="ob-ownerName"
                label="Client owner name"
                hint="This person becomes the Farm Owner account."
                error={errors.ownerName}
              >
                <input
                  id="ob-ownerName"
                  type="text"
                  className={errors.ownerName ? "invalid" : ""}
                  placeholder="e.g. Ramesh Patel"
                  value={form.ownerName}
                  onChange={(e) => update("ownerName", e.target.value)}
                />
              </Field>

              <div className="two-column">
                <Field id="ob-ownerEmail" label="Login email" error={errors.ownerEmail}>
                  <input
                    id="ob-ownerEmail"
                    type="email"
                    className={errors.ownerEmail ? "invalid" : ""}
                    placeholder="owner@clientfarm.com"
                    value={form.ownerEmail}
                    onChange={(e) => update("ownerEmail", e.target.value)}
                  />
                </Field>

                <Field
                  id="ob-ownerPassword"
                  label="Temporary password"
                  hint="Minimum 8 characters. The owner can change it after first login."
                  error={errors.ownerPassword}
                >
                  <div className="ob-input-group">
                    <input
                      id="ob-ownerPassword"
                      type="text"
                      className={errors.ownerPassword ? "invalid" : ""}
                      placeholder="Min 8 characters"
                      value={form.ownerPassword}
                      onChange={(e) => update("ownerPassword", e.target.value)}
                    />
                    <button
                      type="button"
                      className="ob-inline-action"
                      onClick={generatePassword}
                      title="Generate a secure password"
                    >
                      <Icons.Sparkles size={13} />
                      <span>Generate</span>
                    </button>
                  </div>
                </Field>
              </div>

              <div className="callout">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <Icons.Key size={16} style={{ marginTop: 2, color: "var(--green)" }} />
                  <div style={{ fontSize: "13px", lineHeight: 1.5, color: "var(--ink)" }}>
                    The client owner signs in at <code>/login</code> with this email and temporary
                    password. A handover voucher is generated at the end of this flow so you can
                    share the credentials safely.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4 — Team & first plot */}
          {step === 3 && (
            <div className="onboarding-fields">
              <Field
                id="ob-agronomistId"
                label="Assign a dedicated agronomist"
                hint="They'll get access to issue crop prescriptions and monitor this estate."
              >
                <select
                  id="ob-agronomistId"
                  value={form.agronomistId}
                  onChange={(e) => update("agronomistId", e.target.value)}
                >
                  <option value="">-- Assign later --</option>
                  {agronomists.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.email})
                    </option>
                  ))}
                </select>
              </Field>

              <div className="onboarding-divider-label">First plot · optional</div>

              <div className="two-column">
                <Field
                  id="ob-initialPlotName"
                  label="Plot name"
                  error={errors.initialPlotName}
                >
                  <input
                    id="ob-initialPlotName"
                    type="text"
                    className={errors.initialPlotName ? "invalid" : ""}
                    placeholder="e.g. Block A — Polyhouse 1"
                    value={form.initialPlotName}
                    onChange={(e) => update("initialPlotName", e.target.value)}
                  />
                </Field>

                <Field
                  id="ob-initialPlotArea"
                  label="Plot area"
                  error={errors.initialPlotArea}
                >
                  <div className="ob-input-group">
                    <input
                      id="ob-initialPlotArea"
                      type="number"
                      min="0.01"
                      step="0.01"
                      className={errors.initialPlotArea ? "invalid" : ""}
                      placeholder="e.g. 4.0"
                      value={form.initialPlotArea}
                      onChange={(e) => update("initialPlotArea", e.target.value)}
                    />
                    <span className="ob-suffix">acres</span>
                  </div>
                </Field>
              </div>

              <Field id="ob-initialIrrigationType" label="Primary irrigation">
                <select
                  id="ob-initialIrrigationType"
                  value={form.initialIrrigationType}
                  onChange={(e) => update("initialIrrigationType", e.target.value)}
                >
                  <option value="Drip">Drip Irrigation</option>
                  <option value="Sprinkler">Sprinkler</option>
                  <option value="Rain Pipe">Rain Pipe</option>
                  <option value="Flood">Flood / Channel</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
            </div>
          )}

          {/* STEP 5 — Review & provision */}
          {step === 4 && (
            <div className="onboarding-fields">
              <div className="onboarding-review-grid">
                {reviewRows.map((r) => (
                  <div className="onboarding-review-card" key={r.section}>
                    <div className="mono-label" style={{ color: "var(--green)" }}>
                      {r.section}
                    </div>
                    {r.items.map((it) => (
                      <div className="review-row" key={it.label}>
                        <span className="review-key">{it.label}</span>
                        <span className="review-val">{it.value}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              <div className="callout">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <Icons.CheckCircle size={16} style={{ marginTop: 2, color: "var(--green)" }} />
                  <div style={{ fontSize: "13px", lineHeight: 1.5, color: "var(--ink)" }}>
                    Provisioning creates the estate, issues the client owner account, and — where
                    set — assigns the agronomist and demarcates the first plot. This is
                    irreversible.
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Footer actions */}
        <div className="onboarding-footer">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={goBack}
            disabled={step === 0}
            style={{ visibility: step === 0 ? "hidden" : "visible" }}
          >
            <Icons.ArrowLeft size={14} />
            <span>Back</span>
          </button>

          <button type="submit" className="btn btn-green" disabled={pending}>
            {pending ? (
              <>
                <Icons.Spinner size={15} className="spin" />
                <span>{isLast ? "Provisioning…" : "Saving…"}</span>
              </>
            ) : isLast ? (
              <>
                <span>Provision Estate</span>
                <Icons.CheckCircle size={15} />
              </>
            ) : (
              <>
                <span>Continue</span>
                <Icons.ArrowRight size={15} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
