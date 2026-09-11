"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useEffect, useMemo, FormEvent } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { parseBoundary, toGeoJsonPolygon, ringAcres, type LngLat } from "@/lib/geo";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), {
  ssr: false,
});

type HandoverData = {
  estateName: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  loginIdentifier: string;
  initialPassword: string;
  loginUrl: string;
  farmId: string;
};

const STEPS = [
  { id: 1, title: "Client & Legal Entity", desc: "Corporate structure, PAN/GSTIN & contacts" },
  { id: 2, title: "Cadastral Land Parcel", desc: "Khasra/Survey numbers, village & GPS polygon" },
  { id: 3, title: "Soil Science & Water", desc: "Lab pH/EC baseline, borewells & power grid" },
  { id: 4, title: "Turnkey Scope & Plots", desc: "Fencing, roads, crops & parcel zoning" },
  { id: 5, title: "Commercials & Handover", desc: "Contract value, SLAs & owner voucher" },
];

// Lightweight section label — avoids repeating the same block 10×
function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--hairline)" }}>
      <span style={{ fontSize: 14 }}>{icon}</span>
      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

export function ClientOnboardingWizardV2() {
  const router = useRouter();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  // Client Selection Mode
  const [isExistingClient, setIsExistingClient] = useState(false);
  const [clientOptions, setClientOptions] = useState<any[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");

  // Step 1: Client Profile & Legal Entity Details
  const [entityType, setEntityType] = useState("INDIVIDUAL");
  const [companyName, setCompanyName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerDob, setOwnerDob] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [gstin, setGstin] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [secondaryContact, setSecondaryContact] = useState("");

  // Step 2: Cadastral Land Parcel & Satellite Geo-Map
  const [farmName, setFarmName] = useState("");
  const [surveyNumber, setSurveyNumber] = useState("");
  const [village, setVillage] = useState("");
  const [taluk, setTaluk] = useState("");
  const [district, setDistrict] = useState("Chikkaballapur");
  const [state, setState] = useState("Karnataka");
  const [pincode, setPincode] = useState("");
  const [location, setLocation] = useState("Chikkaballapur, Karnataka");
  const [address, setAddress] = useState("");
  const [landTenure, setLandTenure] = useState("Freehold Owned");
  const [terrainType, setTerrainType] = useState("Gentle Gradient (1-3% slope)");
  const [latitude, setLatitude] = useState(13.4325);
  const [longitude, setLongitude] = useState(77.7275);
  const [totalArea, setTotalArea] = useState("");
  const [cultivableArea, setCultivableArea] = useState("");
  const [geofenceRadius, setGeofenceRadius] = useState(600);
  // Real parcel ring (closed [lng,lat]) drawn on GeoMap. Create flow has no
  // pre-existing boundary, so init via parseBoundary(null) -> null; the parse
  // keeps legacy `[{lat,lng}]` tolerance if a seed value is ever passed in.
  const [boundaryRing, setBoundaryRing] = useState<LngLat[] | null>(() => parseBoundary(null));

  // Step 3: Soil Science Baseline & Water / Power Grid
  const [soilType, setSoilType] = useState("Red Sandy Loam");
  const [soilPh, setSoilPh] = useState("6.8");
  const [soilEc, setSoilEc] = useState("0.45");
  const [soilOrganicCarbon, setSoilOrganicCarbon] = useState("0.75");
  const [waterSource, setWaterSource] = useState("Dedicated Agricultural Borewells");
  const [borewellCount, setBorewellCount] = useState("2");
  const [borewellDepthFeet, setBorewellDepthFeet] = useState("650");
  const [waterYieldGph, setWaterYieldGph] = useState("3200");
  const [waterTds, setWaterTds] = useState("320");
  const [electricitySupply, setElectricitySupply] = useState("3-Phase Agricultural Dedicated Feeder");

  // Step 4: Turnkey Scope, Civil Works & Initial Demarcated Parcel
  const [fencingType, setFencingType] = useState("Heavy-Duty Chainlink Fence (6ft / 8ft GI with RCC posts)");
  const [roadSpecs, setRoadSpecs] = useState("WBM All-Weather Tractor Road");
  const [proposedCrops, setProposedCrops] = useState("High-Density Ultra-Orchard (Mango, Avocado, Guava, Dragonfruit)");
  const [initialPlotName, setInitialPlotName] = useState("Zone A - Primary Orchard Block");
  const [initialPlotArea, setInitialPlotArea] = useState("");
  const [initialIrrigationType, setInitialIrrigationType] = useState("Drip");

  // Step 5: Commercials, SLAs & Credentials
  const [contractRef, setContractRef] = useState("AGAATE-WO-2026-0891");
  const [contractValue, setContractValue] = useState("4500000");
  const [targetHandoverDate, setTargetHandoverDate] = useState("");
  const [agronomistList, setAgronomistList] = useState<any[]>([]);
  const [selectedAgronomistId, setSelectedAgronomistId] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [handover, setHandover] = useState<HandoverData | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch clients (server-searched, debounced) and agronomists on mount
  useEffect(() => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ limit: "25" });
      if (clientSearch.trim()) params.set("search", clientSearch.trim());
      fetch(`/api/admin/clients?${params.toString()}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : { clients: [] }))
        .then((d) => setClientOptions(d.clients || []))
        .catch(() => undefined);
    }, 250);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [clientSearch]);

  useEffect(() => {
    fetch("/api/users?role=AGRONOMIST&limit=50")
      .then((r) => (r.ok ? r.json() : { users: [] }))
      .then((d) => setAgronomistList(d.users || []))
      .catch(() => undefined);

    // Default target handover: 90 days from today
    const target = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    setTargetHandoverDate(target.toISOString().split("T")[0]);
  }, []);

  const handleSelectExistingClient = (cId: string) => {
    setSelectedClientId(cId);
    const found = clientOptions.find((c) => c.id === cId);
    if (found) {
      setOwnerName(found.name);
      setOwnerPhone(found.phone || "");
      setOwnerEmail(found.email || "");
      if (found.companyName) setCompanyName(found.companyName);
      if (found.entityType) setEntityType(found.entityType);
      if (found.panNumber) setPanNumber(found.panNumber);
      if (found.gstin) setGstin(found.gstin);
      if (!ownerPassword) {
        setOwnerPassword("ExistingClientAccount!");
      }
    }
  };

  // Generate strong password
  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setOwnerPassword(pass);
  };

  const handleNext = (e?: FormEvent) => {
    e?.preventDefault();
    if (currentStep === 1) {
      if (!ownerName.trim()) {
        toast.show("Please enter the client's full name", "error");
        return;
      }
      if (!ownerPhone.trim() && !ownerEmail.trim()) {
        toast.show("Please provide at least a mobile number or email address", "error");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!farmName.trim()) {
        toast.show("Please provide the farm estate commercial name", "error");
        return;
      }
      if (!totalArea || Number(totalArea) <= 0) {
        toast.show("Please specify total registered acreage", "error");
        return;
      }
      if (Number(cultivableArea) > Number(totalArea)) {
        toast.show("Cultivable area cannot exceed total estate acreage", "error");
        return;
      }
      // Auto-populate location from district + state if not edited
      if (!location.trim()) {
        setLocation(`${district}, ${state}`);
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const ph = soilPh.trim() === "" ? null : Number(soilPh);
      if (ph != null && (Number.isNaN(ph) || ph < 0 || ph > 14)) {
        toast.show("Soil pH must be between 0 and 14", "error");
        return;
      }
      setCurrentStep(4);
    } else if (currentStep === 4) {
      if (!ownerPassword) {
        generatePassword();
      }
      setCurrentStep(5);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ownerPassword) {
      toast.show("Please generate or enter a secure password for the client", "error");
      return;
    }

    setPending(true);
    try {
      const payload = {
        // Legal Entity & Client
        clientId: selectedClientId || null,
        entityType: entityType || null,
        panNumber: panNumber.trim().toUpperCase() || null,
        gstin: gstin.trim().toUpperCase() || null,
        billingAddress: billingAddress.trim() || null,
        secondaryContact: secondaryContact.trim() || null,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim() || null,
        ownerEmail: ownerEmail.trim() || null,
        ownerDob: ownerDob || null,
        ownerPassword: ownerPassword.trim(),

        // Cadastral Land Parcel & Geo-Mapping
        farmName: farmName.trim(),
        surveyNumber: surveyNumber.trim() || null,
        village: village.trim() || null,
        taluk: taluk.trim() || null,
        district: district.trim() || null,
        state: state.trim() || null,
        pincode: pincode.trim() || null,
        location: location.trim() || `${district}, ${state}`,
        address: address.trim() || null,
        terrainType: terrainType || null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        totalArea: Number(totalArea),
        cultivableArea: Number(cultivableArea),
        geofenceRadiusMeters: Number(geofenceRadius),
        boundaryGeoJson: boundaryRing ? toGeoJsonPolygon(boundaryRing) : null,

        // Soil Science Baseline & Water / Power Infrastructure
        soilType: soilType.trim() || null,
        soilPh: soilPh ? Number(soilPh) : null,
        soilEc: soilEc ? Number(soilEc) : null,
        soilOrganicCarbon: soilOrganicCarbon ? Number(soilOrganicCarbon) : null,
        waterSource: waterSource.trim() || null,
        borewellCount: borewellCount ? Number(borewellCount) : null,
        borewellDepthFeet: borewellDepthFeet ? Number(borewellDepthFeet) : null,
        waterYieldGph: waterYieldGph ? Number(waterYieldGph) : null,
        electricitySupply: electricitySupply || null,

        // Turnkey Scope, Civil Works & Demarcation
        fencingType: fencingType || null,
        proposedCrops: proposedCrops.trim() || null,
        initialPlotName: initialPlotName.trim() || null,
        initialPlotArea: initialPlotArea ? Number(initialPlotArea) : null,
        initialIrrigationType,

        // Commercials & Governance
        contractValue: contractValue ? Number(contractValue) : null,
        targetHandoverDate: targetHandoverDate || null,
        agronomistId: selectedAgronomistId || null,
      };

      const res = await fetch("/api/admin/onboard-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to onboard client farm estate");
      }

      setHandover({
        ...data.handover,
        farmId: data.handover?.farmId || data.farm.id,
        // ponytail: server never returns secrets — voucher uses the locally-entered password
        initialPassword: ownerPassword.trim(),
      });
      toast.show("Estate & Client Owner provisioned successfully!", "success");
    } catch (err: any) {
      toast.show(err.message || "Onboarding error", "error");
    } finally {
      setPending(false);
    }
  };

  const copyHandoverVoucher = () => {
    if (!handover) return;
    const text = "🌾 *AGAATE PRECISION AGRICULTURE — CLIENT ACCESS VOUCHER*\n\n" +
      "Estate: " + handover.estateName + "\n" +
      "Owner: " + handover.clientName + "\n" +
      "Login ID: " + handover.loginIdentifier + "\n" +
      "Initial Password: " + handover.initialPassword + "\n" +
      "Access Portal: " + window.location.origin + handover.loginUrl + "\n\n" +
      "_Please keep your credentials secure. You can log in via mobile or computer._";

    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.show("Handover voucher copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 3000);
  };

  const shareViaWhatsApp = () => {
    if (!handover) return;
    const text = encodeURIComponent(
      "🌾 *Agaate Farm Operations Access*\n\n" +
      "Hello " + handover.clientName + ", your estate *" + handover.estateName + "* is provisioned.\n\n" +
      "*Portal*: " + window.location.origin + handover.loginUrl + "\n" +
      "*Login ID*: " + handover.loginIdentifier + "\n" +
      "*Password*: " + handover.initialPassword + "\n\n" +
      "Log in now to monitor harvests, inventory, and crew operations."
    );
    const phone = handover.clientPhone ? handover.clientPhone.replace(/[^\d]/g, "") : "";
    const url = phone ? "https://wa.me/" + phone + "?text=" + text : "https://wa.me/?text=" + text;
    window.open(url, "_blank");
  };

  // Per-stage validation state — every stage communicates complete /
  // incomplete / invalid instead of failing silently at submit time.
  const stageStatus = (step: number): "complete" | "current" | "incomplete" | "invalid" => {
    if (handover) return "complete";
    if (step < currentStep) return "complete";
    if (step > currentStep) return "incomplete";
    if (step === 1) {
      if (!ownerName.trim()) return "incomplete";
      if (!ownerPhone.trim() && !ownerEmail.trim()) return "invalid";
      return "current";
    }
    if (step === 2) {
      if (!farmName.trim() || !totalArea || Number(totalArea) <= 0) return "incomplete";
      if (Number(cultivableArea) > Number(totalArea)) return "invalid";
      return "current";
    }
    if (step === 3) {
      const ph = soilPh.trim() === "" ? null : Number(soilPh);
      if (ph != null && (Number.isNaN(ph) || ph < 0 || ph > 14)) return "invalid";
      return "current";
    }
    return "current";
  };

  // GeoMap center follows the typed lat/lng fields; fall back to India
  // center until valid coordinates exist. Polygon stays optional.
  const mapCenter: [number, number] =
    Number.isFinite(latitude) && Number.isFinite(longitude)
      ? [latitude, longitude]
      : [20.59, 78.96];

  const statedAcres = Number(totalArea);
  const drawnAcres = useMemo(() => (boundaryRing ? ringAcres(boundaryRing) : 0), [boundaryRing]);
  const acreageMismatch =
    boundaryRing !== null &&
    drawnAcres > 0 &&
    Number.isFinite(statedAcres) &&
    statedAcres > 0 &&
    Math.abs(drawnAcres - statedAcres) / statedAcres > 0.1;

  const readiness: { label: string; state: string; detail: string }[] = [
    { label: "Client identity", state: ownerName.trim() && (ownerPhone.trim() || ownerEmail.trim()) ? "Complete" : "Incomplete", detail: "Legal entity, PAN/GSTIN, contacts" },
    { label: "Land parcel & GPS", state: farmName.trim() && Number(totalArea) > 0 && Number(cultivableArea) <= Number(totalArea) ? "Complete" : "Needs review", detail: "Khasra, village, boundary polygon" },
    { label: "Soil & water baseline", state: "Complete", detail: "Lab values recorded as reported by the field team" },
    { label: "Team assignment", state: selectedAgronomistId ? "Complete" : "Awaiting verification", detail: "Agronomist assigned here; field officers are assigned post-handover via Team & Labor" },
    { label: "Documents", state: "Manual check", detail: "Title, ID and compliance documents are verified offline and noted in the audit trail — no document store in this release" },
  ];

  // ── Card shell shared by every step ──────────────────────────────────────
  const cardStyle: React.CSSProperties = {
    background: "var(--surface-card)",
    border: "1px solid var(--hairline)",
    borderRadius: "var(--radius-xl)",
    overflow: "hidden",
  };

  const stepHeaderStyle: React.CSSProperties = {
    padding: "22px 28px 18px",
    borderBottom: "1px solid var(--hairline)",
  };

  const stepBodyStyle: React.CSSProperties = {
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
    gap: 28,
  };

  const stepFooterStyle: React.CSSProperties = {
    padding: "16px 28px",
    borderTop: "1px solid var(--hairline)",
    display: "flex",
    alignItems: "center",
  };

  // ── Field grid helpers ────────────────────────────────────────────────────
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 };
  const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 };
  const grid4: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 };
  const fullCol: React.CSSProperties = { gridColumn: "1 / -1" };

  return (
    <>
      {/* Responsive layout: sidebar stacks above on narrow screens */}
      <style>{`
        .ob-layout { display: grid; grid-template-columns: 256px 1fr; gap: 20px; align-items: start; }
        @media (max-width: 860px) {
          .ob-layout { grid-template-columns: 1fr; }
          .ob-rail { position: static !important; flex-direction: row !important; overflow-x: auto; gap: 0 !important; }
          .ob-rail-btn { flex-direction: column; align-items: center; padding: 12px 14px !important; border-left: none !important; border-bottom: 3px solid transparent; min-width: 90px; text-align: center; }
          .ob-rail-btn[data-active="true"] { border-bottom-color: var(--ink) !important; border-left: none !important; }
          .ob-rail-title { font-size: 11px !important; }
          .ob-rail-desc { display: none; }
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>

        {/* ── PAGE HEADER ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", paddingBottom: 4 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              <span className="eyebrow-dot" />
              <span>SUPER ADMIN PORTAL</span>
            </div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
              Client Estate Onboarding
            </h1>
          </div>
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            <Icons.ChevronLeft size={14} />
            <span>Back to Command</span>
          </Link>
        </div>

        {/* ── HANDOVER VOUCHER ───────────────────────────────────────────── */}
        {handover && (
          <div style={cardStyle}>
            <div style={{ background: "var(--green-tint)", padding: "24px 28px", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--hairline)" }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "var(--green-ink)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icons.CheckCircle size={28} style={{ color: "#fff" }} />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "var(--green-ink)" }}>Client Onboarding Complete!</h2>
                <p style={{ margin: "3px 0 0", fontSize: 13, color: "var(--green-ink)", opacity: 0.8 }}>
                  Farm estate is active. Share the access voucher with the client owner.
                </p>
              </div>
            </div>

            <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Voucher card */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 16, padding: 20, background: "var(--canvas-floor)", borderRadius: "var(--radius-md)", border: "1.5px dashed var(--green-ink)", fontFamily: "monospace" }}>
                {[
                  { label: "ESTATE NAME", value: handover.estateName, highlight: false },
                  { label: "CLIENT OWNER", value: handover.clientName, highlight: false },
                  { label: "LOGIN IDENTIFIER", value: handover.loginIdentifier, highlight: true },
                  { label: "INITIAL PASSWORD", value: handover.initialPassword, highlight: false },
                ].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--muted)", textTransform: "uppercase" as const, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: item.highlight ? "var(--green-ink)" : "var(--ink)" }}>{item.value}</div>
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button type="button" onClick={copyHandoverVoucher} className="btn btn-green">
                  <Icons.Copy size={15} />
                  <span>{copied ? "Copied Voucher!" : "Copy Access Voucher"}</span>
                </button>
                <button type="button" onClick={shareViaWhatsApp} className="btn btn-secondary">
                  <Icons.Send size={15} />
                  <span>Share via WhatsApp</span>
                </button>
                <Link href={"/farms/" + handover.farmId} className="btn btn-outline">
                  <Icons.ArrowRight size={15} />
                  <span>Open Farm Console</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* ── TWO-PANEL WIZARD ───────────────────────────────────────────── */}
        {!handover && (
          <div className="ob-layout">

            {/* LEFT: STEP RAIL */}
            <nav
              className="ob-rail"
              style={{
                position: "sticky",
                top: 72,
                background: "var(--surface-card)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-xl)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ padding: "14px 20px 12px", borderBottom: "1px solid var(--hairline)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" as const, color: "var(--muted-soft)" }}>
                  Onboarding Progress
                </div>
              </div>

              {STEPS.map((step) => {
                const st = stageStatus(step.id);
                const isDone = currentStep > step.id;
                const isCurrent = currentStep === step.id;
                const canClick = step.id < currentStep;
                return (
                  <button
                    key={step.id}
                    type="button"
                    className="ob-rail-btn"
                    data-active={isCurrent ? "true" : "false"}
                    onClick={() => canClick && setCurrentStep(step.id)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 20px",
                      background: isCurrent ? "var(--canvas-floor)" : "transparent",
                      border: "none",
                      borderLeft: isCurrent ? "3px solid var(--ink)" : "3px solid transparent",
                      cursor: canClick ? "pointer" : "default",
                      textAlign: "left",
                      transition: "background 0.12s",
                    }}
                  >
                    {/* Step circle */}
                    <div style={{
                      flexShrink: 0,
                      width: 30,
                      height: 30,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      fontWeight: 700,
                      background: isDone ? "var(--ink)" : isCurrent ? "var(--canvas-floor)" : "transparent",
                      border: isDone ? "none" : isCurrent ? "2px solid var(--ink)" : "2px solid var(--hairline-strong)",
                      color: isDone ? "#fff" : isCurrent ? "var(--ink)" : "var(--muted-soft)",
                    }}>
                      {isDone ? <Icons.Check size={13} /> : step.id}
                    </div>

                    <div style={{ overflow: "hidden", minWidth: 0, flex: 1 }}>
                      <div
                        className="ob-rail-title"
                        style={{
                          fontSize: 13,
                          fontWeight: isCurrent ? 700 : 500,
                          color: isCurrent ? "var(--ink)" : isDone ? "var(--body-strong)" : "var(--muted)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {step.title}
                      </div>
                      <div
                        className="ob-rail-desc"
                        style={{
                          fontSize: 11,
                          color: st === "invalid" ? "var(--red)" : st === "complete" ? "var(--green-ink)" : "var(--muted-soft)",
                          marginTop: 2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {st === "invalid" ? "⚠ Fix to continue" : st === "complete" ? "✓ Complete" : step.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* RIGHT: STEP FORMS */}
            <form onSubmit={currentStep === 5 ? handleSubmit : handleNext}>

              {/* ────────────────────────────────────────────────────────────
                  STEP 1 — CLIENT & LEGAL ENTITY
              ──────────────────────────────────────────────────────────── */}
              {currentStep === 1 && (
                <div style={cardStyle}>
                  <div style={stepHeaderStyle}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--muted-soft)", marginBottom: 4 }}>Step 1 of 5</div>
                    <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>Client Organization & Legal Entity</h2>
                    <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted)" }}>
                      Corporate structure, PAN/GSTIN, authorized signatory & contact details.
                    </p>
                  </div>

                  <div style={stepBodyStyle}>

                    {/* New / Existing client toggle */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button
                        type="button"
                        className={`btn btn-sm ${!isExistingClient ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => { setIsExistingClient(false); setSelectedClientId(""); }}
                      >
                        New Client Organization
                      </button>
                      <button
                        type="button"
                        className={`btn btn-sm ${isExistingClient ? "btn-primary" : "btn-secondary"}`}
                        onClick={() => setIsExistingClient(true)}
                      >
                        Existing Client (Portfolio Expansion)
                      </button>
                    </div>

                    {isExistingClient && (
                      <div style={{ background: "var(--canvas-floor)", padding: 18, borderRadius: "var(--radius-md)", border: "1px solid var(--hairline)", display: "flex", flexDirection: "column", gap: 10 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--muted)" }}>
                          Select Registered Client Account *
                        </div>
                        <input
                          type="search"
                          placeholder="Type to search the portfolio (server-side)…"
                          value={clientSearch}
                          onChange={(e) => setClientSearch(e.target.value)}
                          className="input-field"
                        />
                        <select
                          id="select-client"
                          value={selectedClientId}
                          onChange={(e) => handleSelectExistingClient(e.target.value)}
                          className="input-field"
                          style={{ fontWeight: 600 }}
                        >
                          <option value="">— Choose Existing Client —</option>
                          {clientOptions.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.code} • {c.name} {c.phone ? `(${c.phone})` : ""} — {c.totalFarms} Farms
                            </option>
                          ))}
                        </select>
                        {selectedClientId && (
                          <span style={{ fontSize: 12, color: "var(--green-ink)", fontWeight: 600 }}>
                            ✓ New estate will be attached to {ownerName}&apos;s portfolio.
                          </span>
                        )}
                      </div>
                    )}

                    {/* Entity structure */}
                    <div>
                      <SectionLabel icon="🏢" label="Legal Entity Structure" />
                      <div style={grid2}>
                        <div className="form-group">
                          <label htmlFor="entity-type">Entity Type *</label>
                          <select id="entity-type" value={entityType} onChange={(e) => setEntityType(e.target.value)} className="input-field">
                            <option value="INDIVIDUAL">Individual / HNI Farmland Investor</option>
                            <option value="PVT_LTD">Private Limited Company (Pvt Ltd)</option>
                            <option value="PARTNERSHIP">LLP / Partnership Firm</option>
                            <option value="HUF">Hindu Undivided Family (HUF)</option>
                            <option value="TRUST">Trust / Society / Cooperative</option>
                          </select>
                        </div>
                        {entityType !== "INDIVIDUAL" && (
                          <div className="form-group">
                            <label htmlFor="company-name">Registered Company / Entity Name *</label>
                            <input id="company-name" type="text" placeholder="e.g. Singhania Agro Ventures Pvt Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="input-field" />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Identity */}
                    <div>
                      <SectionLabel icon="👤" label="Authorized Signatory & Contacts" />
                      <div style={grid2}>
                        <div className="form-group">
                          <label htmlFor="owner-name">Full Name *</label>
                          <input id="owner-name" type="text" required placeholder="e.g. Ramesh Chandra Singhania" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="input-field" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="owner-dob">Date of Birth / Incorporation</label>
                          <input id="owner-dob" type="date" value={ownerDob} onChange={(e) => setOwnerDob(e.target.value)} className="input-field" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="owner-phone">Primary Mobile *</label>
                          <input id="owner-phone" type="tel" placeholder="9876543210" value={ownerPhone} onChange={(e) => setOwnerPhone(e.target.value)} className="input-field" />
                          <span className="form-hint">Client can use this number to log in.</span>
                        </div>
                        <div className="form-group">
                          <label htmlFor="owner-email">Official Email</label>
                          <input id="owner-email" type="email" placeholder="ramesh@singhaniafarms.in" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)} className="input-field" />
                        </div>
                      </div>
                    </div>

                    {/* Tax & billing */}
                    <div>
                      <SectionLabel icon="📋" label="Tax Registration & Billing" />
                      <div style={grid2}>
                        <div className="form-group">
                          <label htmlFor="pan-number">PAN Number</label>
                          <input id="pan-number" type="text" maxLength={10} placeholder="ABCDE1234F" value={panNumber} onChange={(e) => setPanNumber(e.target.value.toUpperCase())} className="input-field font-mono" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="gstin">GSTIN</label>
                          <input id="gstin" type="text" maxLength={15} placeholder="29ABCDE1234F1Z5" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} className="input-field font-mono" />
                        </div>
                        <div className="form-group" style={fullCol}>
                          <label htmlFor="billing-address">Registered Billing Address</label>
                          <input id="billing-address" type="text" placeholder="e.g. Penthouse 4B, Prestige Towers, MG Road, Bengaluru 560001" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} className="input-field" />
                        </div>
                        <div className="form-group" style={fullCol}>
                          <label htmlFor="sec-contact">Secondary / Family Office Contact</label>
                          <input id="sec-contact" type="text" placeholder="e.g. CFO Suresh Kumar: +91 9448123456 (suresh@singhania.estate)" value={secondaryContact} onChange={(e) => setSecondaryContact(e.target.value)} className="input-field" />
                        </div>
                      </div>
                    </div>

                  </div>

                  <div style={{ ...stepFooterStyle, justifyContent: "flex-end" }}>
                    <button type="submit" className="btn btn-primary">
                      <span>Next: Cadastral & Map</span>
                      <Icons.ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────
                  STEP 2 — CADASTRAL LAND PARCEL & GEO-MAP
              ──────────────────────────────────────────────────────────── */}
              {currentStep === 2 && (
                <div style={cardStyle}>
                  <div style={stepHeaderStyle}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--muted-soft)", marginBottom: 4 }}>Step 2 of 5</div>
                    <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>Cadastral Land Parcel & Satellite Coordinates</h2>
                    <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted)" }}>
                      Revenue survey numbers, boundary demarcation & tactical satellite geofence.
                    </p>
                  </div>

                  {/* Acreage-mismatch flag — advisory only, never blocks onboarding */}
                  {acreageMismatch && (
                    <div role="alert" style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 28px", background: "var(--amber-light)", borderBottom: "1px solid var(--hairline)" }}>
                      <Icons.AlertTriangle size={15} style={{ color: "var(--amber)", flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--amber)" }}>
                        Drawn {drawnAcres.toFixed(2)} ac vs stated {statedAcres.toFixed(2)} ac — verify before proceeding
                      </span>
                    </div>
                  )}

                  <div style={stepBodyStyle}>

                    {/* Satellite map */}
                    <div>
                      <SectionLabel icon="🛰" label="Satellite Geo-Map & Parcel Boundary" />
                      <div style={{ background: "var(--canvas-floor)", borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--hairline)" }}>
                        <GeoMap center={mapCenter} polygon={boundaryRing} onChange={setBoundaryRing} height={300} />
                      </div>
                      <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--muted)" }}>
                        Draw the parcel polygon on satellite imagery. Boundary stays optional — clearing it keeps onboarding unblocked.
                      </p>
                    </div>

                    {/* Estate identity */}
                    <div>
                      <SectionLabel icon="🏡" label="Estate Identity & Tenure" />
                      <div style={grid2}>
                        <div className="form-group" style={fullCol}>
                          <label htmlFor="farm-name">Farm Estate Commercial Name *</label>
                          <input id="farm-name" type="text" required placeholder="e.g. Kolar Highland Alphonso Orchard" value={farmName} onChange={(e) => setFarmName(e.target.value)} className="input-field" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="survey-number">Survey / Khasra / Patta #</label>
                          <input id="survey-number" type="text" placeholder="e.g. Sy No. 142/1, 142/2A" value={surveyNumber} onChange={(e) => setSurveyNumber(e.target.value)} className="input-field font-mono" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="land-tenure">Land Title & Tenure</label>
                          <select id="land-tenure" value={landTenure} onChange={(e) => setLandTenure(e.target.value)} className="input-field">
                            <option value="Freehold Owned">Freehold Owned (Sole Title)</option>
                            <option value="Long-Term Agricultural Lease">Long-Term Lease (10+ Yrs)</option>
                            <option value="Joint Development">Joint Development (JDA)</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Revenue location */}
                    <div>
                      <SectionLabel icon="📍" label="Revenue Location" />
                      <div style={grid3}>
                        <div className="form-group">
                          <label htmlFor="village">Revenue Village</label>
                          <input id="village" type="text" placeholder="e.g. Nandi Village" value={village} onChange={(e) => setVillage(e.target.value)} className="input-field" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="taluk">Taluk / Tehsil</label>
                          <input id="taluk" type="text" placeholder="e.g. Chikkaballapur" value={taluk} onChange={(e) => setTaluk(e.target.value)} className="input-field" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="pincode">PIN Code</label>
                          <input id="pincode" type="text" placeholder="e.g. 562101" value={pincode} onChange={(e) => setPincode(e.target.value)} className="input-field font-mono" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="district">Revenue District *</label>
                          <input id="district" type="text" required placeholder="e.g. Chikkaballapur" value={district} onChange={(e) => setDistrict(e.target.value)} className="input-field" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="state">State *</label>
                          <select id="state" value={state} onChange={(e) => setState(e.target.value)} className="input-field">
                            <option value="Karnataka">Karnataka</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                            <option value="Gujarat">Gujarat</option>
                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="terrain-type">Terrain & Topography</label>
                          <select id="terrain-type" value={terrainType} onChange={(e) => setTerrainType(e.target.value)} className="input-field">
                            <option value="Flat Plain (0-1% slope)">Flat Plain (0-1%)</option>
                            <option value="Gentle Gradient (1-3% slope)">Gentle Gradient (1-3%)</option>
                            <option value="Rolling Undulating Hills">Rolling Hills</option>
                            <option value="Terraced Hillside">Terraced Hillside</option>
                            <option value="Valley Floor">Valley Floor</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* GPS & acreage */}
                    <div>
                      <SectionLabel icon="📐" label="GPS Coordinates & Acreage" />
                      <div style={grid4}>
                        <div className="form-group">
                          <label htmlFor="latitude">Latitude *</label>
                          <input id="latitude" type="number" step="0.000001" min="-90" max="90" required value={Number.isFinite(latitude) ? latitude : ""} onChange={(e) => setLatitude(e.target.value === "" ? NaN : Number(e.target.value))} className="input-field font-mono" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="longitude">Longitude *</label>
                          <input id="longitude" type="number" step="0.000001" min="-180" max="180" required value={Number.isFinite(longitude) ? longitude : ""} onChange={(e) => setLongitude(e.target.value === "" ? NaN : Number(e.target.value))} className="input-field font-mono" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="total-area">Total Area (Acres) *</label>
                          <input id="total-area" type="number" step="0.1" min="0.1" required value={totalArea} onChange={(e) => setTotalArea(e.target.value)} className="input-field" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="cultivable-area">Cultivable Area (Acres) *</label>
                          <input id="cultivable-area" type="number" step="0.1" min="0.1" required value={cultivableArea} onChange={(e) => setCultivableArea(e.target.value)} className="input-field" />
                        </div>
                        <div className="form-group" style={{ gridColumn: "1 / 3" }}>
                          <label htmlFor="geofence">Geofence Attendance Radius (Meters)</label>
                          <input id="geofence" type="number" min="100" max="5000" step="50" value={geofenceRadius} onChange={(e) => setGeofenceRadius(Number(e.target.value))} className="input-field font-mono" />
                          <span className="form-hint">Map center follows typed coordinates.</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div style={{ ...stepFooterStyle, justifyContent: "space-between" }}>
                    <button type="button" onClick={() => setCurrentStep(1)} className="btn btn-secondary">
                      <Icons.ChevronLeft size={15} />
                      <span>Back</span>
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <span>Next: Soil & Water</span>
                      <Icons.ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────
                  STEP 3 — SOIL SCIENCE BASELINE & WATER/POWER GRID
              ──────────────────────────────────────────────────────────── */}
              {currentStep === 3 && (
                <div style={cardStyle}>
                  <div style={stepHeaderStyle}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--muted-soft)", marginBottom: 4 }}>Step 3 of 5</div>
                    <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>Soil Science Baseline, Water & Power</h2>
                    <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted)" }}>
                      Laboratory soil benchmarks, borewell yield capacity & agricultural power feeders.
                    </p>
                  </div>

                  <div style={stepBodyStyle}>

                    {/* Soil */}
                    <div>
                      <SectionLabel icon="🧪" label="Soil Science Baseline" />
                      <div style={grid2}>
                        <div className="form-group" style={fullCol}>
                          <label htmlFor="soil-type">Primary Soil Classification *</label>
                          <select id="soil-type" value={soilType} onChange={(e) => setSoilType(e.target.value)} className="input-field">
                            <option value="Red Sandy Loam">Red Sandy Loam (High Aeration, Well Draining)</option>
                            <option value="Black Cotton Soil">Black Cotton Soil (Vertisol, High Moisture Retention)</option>
                            <option value="Alluvial Loam">Alluvial Loam (High Fertility River Basin)</option>
                            <option value="Laterite Red Soil">Laterite Red Soil (Acidic, Good for Plantation)</option>
                            <option value="Silty Clay Loam">Silty Clay Loam</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="soil-ph">Soil pH Baseline</label>
                          <input id="soil-ph" type="number" step="0.1" min="3.0" max="11.0" placeholder="e.g. 6.8 (Neutral)" value={soilPh} onChange={(e) => setSoilPh(e.target.value)} className="input-field font-mono" />
                          <span className="form-hint">Optimal: 6.2–7.5</span>
                        </div>
                        <div className="form-group">
                          <label htmlFor="soil-ec">Electrical Conductivity (EC dS/m)</label>
                          <input id="soil-ec" type="number" step="0.01" placeholder="e.g. 0.45" value={soilEc} onChange={(e) => setSoilEc(e.target.value)} className="input-field font-mono" />
                          <span className="form-hint">&lt;1.0 dS/m = non-saline</span>
                        </div>
                        <div className="form-group">
                          <label htmlFor="soil-oc">Organic Carbon (OC %)</label>
                          <input id="soil-oc" type="number" step="0.01" placeholder="e.g. 0.75" value={soilOrganicCarbon} onChange={(e) => setSoilOrganicCarbon(e.target.value)} className="input-field font-mono" />
                          <span className="form-hint">&gt;0.75% = fertile baseline</span>
                        </div>
                      </div>
                    </div>

                    {/* Water */}
                    <div>
                      <SectionLabel icon="💧" label="Water Resources" />
                      <div style={grid2}>
                        <div className="form-group" style={fullCol}>
                          <label htmlFor="water-source">Primary Water Resource</label>
                          <select id="water-source" value={waterSource} onChange={(e) => setWaterSource(e.target.value)} className="input-field">
                            <option value="Dedicated Agricultural Borewells">Dedicated Agricultural Borewells</option>
                            <option value="Open Irrigation Well / Baori">Open Irrigation Well / Baori</option>
                            <option value="Perennial River / Stream Lift">Perennial River / Stream Lift</option>
                            <option value="Canal Irrigation Branch (Scheduled)">Canal Irrigation Branch (Scheduled)</option>
                            <option value="Rainwater Harvesting Farm Pond">Rainwater Harvesting Farm Pond (Krishi Honda)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="borewell-count">Active Borewells</label>
                          <input id="borewell-count" type="number" min="0" max="50" placeholder="e.g. 2" value={borewellCount} onChange={(e) => setBorewellCount(e.target.value)} className="input-field font-mono" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="borewell-depth">Avg Depth (Feet)</label>
                          <input id="borewell-depth" type="number" min="0" max="3000" placeholder="e.g. 650" value={borewellDepthFeet} onChange={(e) => setBorewellDepthFeet(e.target.value)} className="input-field font-mono" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="water-yield">Discharge Yield (GPH)</label>
                          <input id="water-yield" type="number" placeholder="e.g. 3200" value={waterYieldGph} onChange={(e) => setWaterYieldGph(e.target.value)} className="input-field font-mono" />
                        </div>
                      </div>
                    </div>

                    {/* Power */}
                    <div>
                      <SectionLabel icon="⚡" label="Agricultural Power Supply" />
                      <div className="form-group">
                        <label htmlFor="power-grid">Electrical Supply *</label>
                        <select id="power-grid" value={electricitySupply} onChange={(e) => setElectricitySupply(e.target.value)} className="input-field">
                          <option value="3-Phase Agricultural Dedicated Feeder">3-Phase Dedicated Agricultural Feeder (Govt Subsidized/Tariff)</option>
                          <option value="Dedicated 25kVA Step-Down Transformer">Dedicated 25kVA / 63kVA Step-Down Transformer on 11kV line</option>
                          <option value="Solar PV Agri Pumping System (10HP Off-Grid)">Solar PV Agri Pumping System (10HP–20HP Off-Grid)</option>
                          <option value="Diesel Generator Backup (DG Set 25kVA)">Diesel Generator Backup (DG Set 25kVA–50kVA)</option>
                        </select>
                      </div>
                    </div>

                  </div>

                  <div style={{ ...stepFooterStyle, justifyContent: "space-between" }}>
                    <button type="button" onClick={() => setCurrentStep(2)} className="btn btn-secondary">
                      <Icons.ChevronLeft size={15} />
                      <span>Back</span>
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <span>Next: Turnkey Scope</span>
                      <Icons.ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────
                  STEP 4 — TURNKEY SCOPE & INITIAL PARCEL
              ──────────────────────────────────────────────────────────── */}
              {currentStep === 4 && (
                <div style={cardStyle}>
                  <div style={stepHeaderStyle}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--muted-soft)", marginBottom: 4 }}>Step 4 of 5</div>
                    <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>Turnkey Scope, Civil Works & Initial Parcel</h2>
                    <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted)" }}>
                      Boundary fencing, internal roads, proposed crop varieties & initial parcel demarcation.
                    </p>
                  </div>

                  <div style={stepBodyStyle}>

                    {/* Civil works */}
                    <div>
                      <SectionLabel icon="🏗" label="Civil Works & Infrastructure" />
                      <div style={grid2}>
                        <div className="form-group">
                          <label htmlFor="fencing-type">Boundary Security & Fencing</label>
                          <select id="fencing-type" value={fencingType} onChange={(e) => setFencingType(e.target.value)} className="input-field">
                            <option value="Heavy-Duty Chainlink Fence (6ft / 8ft GI with RCC posts)">Heavy-Duty Chainlink (6ft/8ft GI + RCC posts)</option>
                            <option value="Solar High-Voltage Security Electric Fence">Solar High-Voltage Electric Fence</option>
                            <option value="Barbed Wire 8-Strand with Granite Pillars">Barbed Wire 8-Strand + Granite Pillars</option>
                            <option value="Stone Wall Compound">Natural Stone Compound Wall</option>
                            <option value="Living Bio-Fence">Living Bio-Fence (Bougainvillea / Bamboo)</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label htmlFor="road-specs">Internal Tractor Access Roads</label>
                          <select id="road-specs" value={roadSpecs} onChange={(e) => setRoadSpecs(e.target.value)} className="input-field">
                            <option value="WBM All-Weather Tractor Road">WBM All-Weather Tractor Road (12ft)</option>
                            <option value="Murrum Graded Farm Track">Murrum Graded Farm Track</option>
                            <option value="Concrete Paved Farmyard & Tractor Ramp">Concrete Paved Farmyard & Tractor Ramp</option>
                          </select>
                        </div>
                        <div className="form-group" style={fullCol}>
                          <label htmlFor="proposed-crops">Proposed Plantation & Cropping Architecture</label>
                          <input id="proposed-crops" type="text" placeholder="e.g. High-Density Mango (Alphonso), Hass Avocado, Dragonfruit, Turmeric" value={proposedCrops} onChange={(e) => setProposedCrops(e.target.value)} className="input-field" />
                        </div>
                      </div>
                    </div>

                    {/* Initial parcel */}
                    <div>
                      <SectionLabel icon="🌱" label="Initial Management Parcel" />
                      <div style={grid3}>
                        <div className="form-group" style={fullCol}>
                          <label htmlFor="plot-name">Plot / Zone Name *</label>
                          <input id="plot-name" type="text" placeholder="e.g. Zone A - Primary Orchard Block" value={initialPlotName} onChange={(e) => setInitialPlotName(e.target.value)} className="input-field" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="plot-area">Plot Area (Acres)</label>
                          <input id="plot-area" type="number" step="0.1" placeholder="e.g. 5.0" value={initialPlotArea} onChange={(e) => setInitialPlotArea(e.target.value)} className="input-field font-mono" />
                          <span className="form-hint">Available: {cultivableArea || totalArea} cultivable acres</span>
                        </div>
                        <div className="form-group">
                          <label htmlFor="irrigation">Irrigation Infrastructure</label>
                          <select id="irrigation" value={initialIrrigationType} onChange={(e) => setInitialIrrigationType(e.target.value)} className="input-field">
                            <option value="Drip">Inline PC Drip System</option>
                            <option value="Sprinkler">Micro-Sprinkler Overhead Canopy</option>
                            <option value="Rain Pipe">Rain Pipe High-Density Spray</option>
                            <option value="Flood">Flood & Furrow Basin</option>
                          </select>
                        </div>
                      </div>
                    </div>

                  </div>

                  <div style={{ ...stepFooterStyle, justifyContent: "space-between" }}>
                    <button type="button" onClick={() => setCurrentStep(3)} className="btn btn-secondary">
                      <Icons.ChevronLeft size={15} />
                      <span>Back</span>
                    </button>
                    <button type="submit" className="btn btn-primary">
                      <span>Next: Commercials & Handover</span>
                      <Icons.ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              )}

              {/* ────────────────────────────────────────────────────────────
                  STEP 5 — COMMERCIALS, SLAS & CREDENTIALS HANDOVER
              ──────────────────────────────────────────────────────────── */}
              {currentStep === 5 && (
                <div style={cardStyle}>
                  <div style={stepHeaderStyle}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--muted-soft)", marginBottom: 4 }}>Step 5 of 5</div>
                    <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>Commercials, SLAs & Credentials Handover</h2>
                    <p style={{ margin: "5px 0 0", fontSize: 13, color: "var(--muted)" }}>
                      Contract reference, handover milestone, assigned agronomist & owner access credentials.
                    </p>
                  </div>

                  <div style={stepBodyStyle}>

                    {/* Contract */}
                    <div>
                      <SectionLabel icon="📄" label="Contract & Commercials" />
                      <div style={grid3}>
                        <div className="form-group">
                          <label htmlFor="contract-ref">Work Order / Contract Ref No.</label>
                          <input id="contract-ref" type="text" placeholder="e.g. AGAATE-WO-2026-0891" value={contractRef} onChange={(e) => setContractRef(e.target.value)} className="input-field font-mono" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="contract-val">Project Value (INR ₹)</label>
                          <input id="contract-val" type="number" placeholder="e.g. 4500000" value={contractValue} onChange={(e) => setContractValue(e.target.value)} className="input-field font-mono" />
                        </div>
                        <div className="form-group">
                          <label htmlFor="target-date">Target Handover Date (SLA)</label>
                          <input id="target-date" type="date" value={targetHandoverDate} onChange={(e) => setTargetHandoverDate(e.target.value)} className="input-field font-mono" />
                          <span className="form-hint">Standard SLA: 90 days from groundbreaking</span>
                        </div>
                      </div>
                    </div>

                    {/* Team */}
                    <div>
                      <SectionLabel icon="👨‍🌾" label="Project Team Assignment" />
                      <div className="form-group" style={{ maxWidth: 420 }}>
                        <label htmlFor="assign-agronomist">Designated Project Agronomist / Engineer</label>
                        <select id="assign-agronomist" value={selectedAgronomistId} onChange={(e) => setSelectedAgronomistId(e.target.value)} className="input-field">
                          <option value="">— Select Dedicated Agronomist —</option>
                          {agronomistList.map((a) => (
                            <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Credentials */}
                    <div>
                      <SectionLabel icon="🔐" label="Client Access Credentials" />
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 500 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <label htmlFor="owner-pass" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                            Initial Secure Password *
                          </label>
                          <button type="button" onClick={generatePassword} className="btn btn-link" style={{ fontSize: 12, padding: 0 }}>
                            Regenerate Strong Password
                          </button>
                        </div>
                        <input
                          id="owner-pass"
                          type="text"
                          required
                          value={ownerPassword}
                          onChange={(e) => setOwnerPassword(e.target.value)}
                          placeholder="Click Regenerate or enter a custom password"
                          className="input-field font-mono"
                        />
                        <span className="form-hint">This password appears on the printed handover voucher.</span>
                      </div>
                    </div>

                    {/* ── Readiness Checklist ─────────────────────────────── */}
                    <div>
                      <SectionLabel icon="✅" label="Pre-Activation Readiness Check" />
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {readiness.map((r) => {
                          const isComplete = r.state === "Complete";
                          const isManual = r.state === "Manual check";
                          const accentColor = isComplete
                            ? "var(--green-ink)"
                            : isManual
                            ? "var(--muted-soft)"
                            : "var(--amber)";
                          const chipBg = isComplete
                            ? "var(--green-tint)"
                            : isManual
                            ? "var(--surface-strong)"
                            : "var(--amber-light)";
                          return (
                            <div
                              key={r.label}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 14,
                                padding: "12px 16px",
                                background: "var(--canvas-floor)",
                                borderRadius: "var(--radius-md)",
                                border: "1px solid var(--hairline)",
                                borderLeft: `4px solid ${accentColor}`,
                              }}
                            >
                              <div style={{ flexShrink: 0, fontSize: 18 }}>
                                {isComplete ? "✅" : isManual ? "📋" : "⚠️"}
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                  {r.label}
                                  <span style={{ fontSize: 11, fontWeight: 700, padding: "1px 8px", borderRadius: 99, background: chipBg, color: accentColor }}>
                                    {r.state}
                                  </span>
                                </div>
                                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>{r.detail}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* ── Summary Dossier ─────────────────────────────────── */}
                    <div>
                      <SectionLabel icon="📋" label="Summary Dossier for Activation" />
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                        {[
                          { emoji: "🏢", label: "Entity", value: `${companyName || ownerName} (${entityType})` },
                          { emoji: "👤", label: "Signatory", value: ownerName || "—" },
                          { emoji: "📱", label: "Mobile", value: ownerPhone || "None" },
                          { emoji: "✉️", label: "Email", value: ownerEmail || "Auto-generated" },
                          { emoji: "🌾", label: "Estate", value: farmName ? `${farmName} (${totalArea} Ac)` : "—" },
                          { emoji: "📍", label: "Cadastral", value: surveyNumber ? `Sy #${surveyNumber}` : "Pending Sy #" },
                          { emoji: "🧪", label: "Soil pH", value: `${soilPh} · ${soilType.split(" ")[0]}` },
                          { emoji: "💧", label: "Water", value: `${borewellCount} Borewells · ${waterYieldGph} GPH` },
                        ].map((item) => (
                          <div key={item.label} style={{ padding: "11px 14px", background: "var(--canvas-floor)", borderRadius: "var(--radius-md)", border: "1px solid var(--hairline)" }}>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3 }}>{item.emoji} {item.label}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  <div style={{ ...stepFooterStyle, justifyContent: "space-between" }}>
                    <button type="button" onClick={() => setCurrentStep(4)} className="btn btn-secondary">
                      <Icons.ChevronLeft size={15} />
                      <span>Back</span>
                    </button>
                    <button type="submit" disabled={pending} className="btn btn-green btn-lg">
                      <Icons.Check size={16} />
                      <span>{pending ? "Provisioning Estate Infrastructure…" : "Activate Estate & Generate Handover Voucher"}</span>
                    </button>
                  </div>
                </div>
              )}

            </form>
          </div>
        )}
      </div>
    </>
  );
}
