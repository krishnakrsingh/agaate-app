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

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header & Step Tracker */}
      <div className="compact-card" style={{ padding: "20px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              <span className="eyebrow-dot" />
              <span>SUPER ADMIN PORTAL</span>
            </div>
            <h1 className="page-title" style={{ margin: 0, fontSize: "22px" }}>
              Client Estate Multi-Screen Onboarding
            </h1>
          </div>
          <Link href="/dashboard" className="btn btn-secondary btn-sm">
            <Icons.ChevronLeft size={14} />
            <span>Back to Command</span>
          </Link>
        </div>

        {/* Step Progress Bar (5 Enterprise Steps) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 20 }}>
          {STEPS.map((step) => {
            const isDone = currentStep > step.id || handover !== null;
            const isCurrent = currentStep === step.id && !handover;
            const st = stageStatus(step.id);
            return (
              <div
                key={step.id}
                onClick={() => {
                  if (!handover && step.id < currentStep) setCurrentStep(step.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: "var(--radius-sm)",
                  background: isCurrent
                    ? "var(--green-tint)"
                    : isDone
                    ? "var(--surface-strong)"
                    : "transparent",
                  border: isCurrent
                    ? "1px solid var(--green-tint)"
                    : isDone
                    ? "1px solid var(--surface-strong)"
                    : "1px solid var(--hairline)",
                  cursor: !handover && step.id < currentStep ? "pointer" : "default",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: 700,
                    background: isDone
                      ? "var(--green-ink)"
                      : isCurrent
                      ? "var(--green-tint)"
                      : "var(--surface-strong)",
                    color: isDone ? "#FFFFFF" : isCurrent ? "var(--green-ink)" : "var(--muted)",
                  }}
                >
                  {isDone ? <Icons.Check size={12} /> : step.id}
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: isCurrent ? "var(--ink)" : "var(--muted)", whiteSpace: "nowrap" }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: "10px", color: st === "invalid" ? "var(--red)" : "var(--muted)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {st === "invalid" ? "Invalid — fix to continue" : st === "incomplete" ? "Incomplete" : st === "complete" ? "Complete" : step.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HANDOVER VOUCHER */}
      {handover && (
        <div className="compact-card tone-green" style={{ padding: 32, gap: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "var(--green-tint)",
                border: "1px solid var(--green-tint)",
                color: "var(--green-ink)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icons.CheckCircle size={28} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700 }}>Client Onboarding Completed!</h2>
              <p className="muted" style={{ margin: "2px 0 0", fontSize: "13px" }}>
                Farm estate is active and owner access voucher is ready for handover.
              </p>
            </div>
          </div>

          <div
            style={{
              padding: 20,
              borderRadius: "var(--radius-md)",
              background: "var(--surface-card)",
              border: "1px dashed var(--green-ink)",
              fontFamily: "monospace",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>ESTATE NAME</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>{handover.estateName}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>CLIENT OWNER</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>{handover.clientName}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>LOGIN IDENTIFIER</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--green-ink)" }}>{handover.loginIdentifier}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--muted)" }}>INITIAL PASSWORD</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--ink)" }}>{handover.initialPassword}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" onClick={copyHandoverVoucher} className="btn btn-green">
              <Icons.Copy size={16} />
              <span>{copied ? "Copied Voucher!" : "Copy Access Voucher"}</span>
            </button>
            <button type="button" onClick={shareViaWhatsApp} className="btn btn-secondary">
              <Icons.Send size={16} />
              <span>Share via WhatsApp</span>
            </button>
            <Link href={"/farms/" + handover.farmId} className="btn btn-outline">
              <Icons.ArrowRight size={16} />
              <span>Open Farm Console</span>
            </Link>
          </div>
        </div>
      )}

      {/* MULTI-SCREEN FORMS */}
      {!handover && (
        <form onSubmit={currentStep === 5 ? handleSubmit : handleNext}>
          {/* SCREEN 1: CLIENT & LEGAL ENTITY */}
          {currentStep === 1 && (
            <div className="compact-card" style={{ padding: 28, gap: 20 }}>
              <div className="card-header" style={{ padding: 0 }}>
                <div>
                  <h2 className="section-title" style={{ margin: "0 0 4px", fontSize: "18px" }}>
                    Step 1: Client Organization &amp; Legal Entity Profile
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
                    Onboard a new corporate or individual client, or expand an existing client&apos;s multi-estate portfolio.
                  </p>
                </div>
              </div>

              {/* Mode Toggle */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${!isExistingClient ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => {
                    setIsExistingClient(false);
                    setSelectedClientId("");
                  }}
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
                <div className="form-group" style={{ background: "var(--surface-strong)", padding: 14, borderRadius: "var(--radius-sm)" }}>
                  <label htmlFor="select-client" style={{ fontWeight: 700, display: "block", marginBottom: 6 }}>
                    Select Registered Client Account *
                  </label>
                  <input
                    type="search"
                    placeholder="Type to search the portfolio (server-side)…"
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    className="input-field"
                    style={{ marginBottom: 8 }}
                  />
                  <select
                    id="select-client"
                    value={selectedClientId}
                    onChange={(e) => handleSelectExistingClient(e.target.value)}
                    className="input-field"
                    style={{ fontWeight: 600, width: "100%", padding: "8px 10px" }}
                  >
                    <option value="">-- Choose Existing Client --</option>
                    {clientOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} • {c.name} {c.phone ? `(${c.phone})` : ""} - {c.totalFarms} Farms
                      </option>
                    ))}
                  </select>
                  {selectedClientId && (
                    <span className="form-hint" style={{ color: "var(--green)", marginTop: 6, display: "block" }}>
                      ✓ Existing account selected. This new estate will be attached to {ownerName}&apos;s portfolio.
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <div className="form-group">
                  <label htmlFor="entity-type">Legal Entity Structure *</label>
                  <select
                    id="entity-type"
                    value={entityType}
                    onChange={(e) => setEntityType(e.target.value)}
                    className="input-field"
                  >
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
                    <input
                      id="company-name"
                      type="text"
                      placeholder="e.g. Singhania Agro Ventures Pvt Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="input-field"
                    />
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="owner-name">Authorized Signatory / Client Full Name *</label>
                  <input
                    id="owner-name"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra Singhania"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="owner-phone">Primary Mobile Number *</label>
                  <input
                    id="owner-phone"
                    type="tel"
                    placeholder="e.g. 9876543210 (Used for mobile login)"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    className="input-field"
                  />
                  <span className="form-hint">Client can use this mobile number to log in directly.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="owner-email">Official Email Address</label>
                  <input
                    id="owner-email"
                    type="email"
                    placeholder="e.g. ramesh@singhaniafarms.in"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="owner-dob">Date of Birth / Incorporation</label>
                  <input
                    id="owner-dob"
                    type="date"
                    value={ownerDob}
                    onChange={(e) => setOwnerDob(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="pan-number">Permanent Account Number (PAN)</label>
                  <input
                    id="pan-number"
                    type="text"
                    maxLength={10}
                    placeholder="e.g. ABCDE1234F"
                    value={panNumber}
                    onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                    className="input-field font-mono"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="gstin">GSTIN (Goods &amp; Services Tax No.)</label>
                  <input
                    id="gstin"
                    type="text"
                    maxLength={15}
                    placeholder="e.g. 29ABCDE1234F1Z5"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    className="input-field font-mono"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="billing-address">Registered Billing Address</label>
                  <input
                    id="billing-address"
                    type="text"
                    placeholder="e.g. Penthouse 4B, Prestige Towers, MG Road, Bengaluru 560001"
                    value={billingAddress}
                    onChange={(e) => setBillingAddress(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="sec-contact">Secondary / Family Office Operations Contact</label>
                  <input
                    id="sec-contact"
                    type="text"
                    placeholder="e.g. CFO Suresh Kumar: +91 9448123456 (suresh@singhania.estate)"
                    value={secondaryContact}
                    onChange={(e) => setSecondaryContact(e.target.value)}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button type="submit" className="btn btn-green">
                  <span>Proceed to Cadastral &amp; Map</span>
                  <Icons.ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: CADASTRAL LAND PARCEL & SATELLITE GEO-MAP */}
          {currentStep === 2 && (
            <div className="compact-card" style={{ padding: 28, gap: 20 }}>
              <div className="card-header" style={{ padding: 0 }}>
                <div>
                  <h2 className="section-title" style={{ margin: "0 0 4px", fontSize: "18px" }}>
                    Step 2: Cadastral Land Parcel &amp; Satellite Coordinates
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
                    Record authentic revenue survey numbers, boundary demarcation, and tactical satellite geofence.
                  </p>
                </div>
              </div>

              {/* Acreage-mismatch flag: drawn polygon vs stated revenue acreage.
                  Advisory only — polygon stays optional, never blocks onboarding. */}
              {acreageMismatch && (
                <div
                  role="alert"
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    padding: "10px 14px",
                    background: "var(--amber-light)",
                    border: "1px solid var(--amber-light)",
                    borderRadius: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <Icons.AlertTriangle size={16} style={{ color: "var(--amber)" }} />
                  <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--amber)" }}>
                    Drawn {drawnAcres.toFixed(2)} ac vs stated {statedAcres.toFixed(2)} ac — verify before proceeding
                  </span>
                </div>
              )}

              {/* Split layout: Tactical Map on Left, Parameters on Right */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24, alignItems: "start" }}>
                {/* Left: Real satellite GeoMap */}
                <div style={{ background: "var(--surface-strong)", padding: 16, borderRadius: "var(--radius-md)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
                      Satellite Geo-Map &amp; Parcel Boundary
                    </div>
                    <span className="badge badge-green" style={{ fontSize: "10px" }}>Interactive GPS</span>
                  </div>

                  <GeoMap
                    center={mapCenter}
                    polygon={boundaryRing}
                    onChange={setBoundaryRing}
                    height={340}
                  />
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8 }}>
                    Draw the parcel polygon on satellite imagery. Clearing the shape keeps onboarding unblocked — boundary stays optional.
                  </div>
                </div>

                {/* Right: Cadastral Specs Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="form-group">
                    <label htmlFor="farm-name">Farm Estate Commercial Name *</label>
                    <input
                      id="farm-name"
                      type="text"
                      required
                      placeholder="e.g. Kolar Highland Alphonso Orchard"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                      className="input-field"
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label htmlFor="survey-number">Survey / Khasra / Patta # *</label>
                      <input
                        id="survey-number"
                        type="text"
                        placeholder="e.g. Sy No. 142/1, 142/2A"
                        value={surveyNumber}
                        onChange={(e) => setSurveyNumber(e.target.value)}
                        className="input-field font-mono"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="land-tenure">Land Title &amp; Tenure</label>
                      <select
                        id="land-tenure"
                        value={landTenure}
                        onChange={(e) => setLandTenure(e.target.value)}
                        className="input-field"
                      >
                        <option value="Freehold Owned">Freehold Owned (Sole Title)</option>
                        <option value="Long-Term Agricultural Lease">Long-Term Lease (10+ Yrs)</option>
                        <option value="Joint Development">Joint Development (JDA)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                    <div className="form-group">
                      <label htmlFor="village">Revenue Village</label>
                      <input
                        id="village"
                        type="text"
                        placeholder="e.g. Nandi Village"
                        value={village}
                        onChange={(e) => setVillage(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="taluk">Taluk / Tehsil</label>
                      <input
                        id="taluk"
                        type="text"
                        placeholder="e.g. Chikkaballapur"
                        value={taluk}
                        onChange={(e) => setTaluk(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="pincode">PIN Code</label>
                      <input
                        id="pincode"
                        type="text"
                        placeholder="e.g. 562101"
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        className="input-field font-mono"
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label htmlFor="district">Revenue District *</label>
                      <input
                        id="district"
                        type="text"
                        required
                        placeholder="e.g. Chikkaballapur"
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="state">State *</label>
                      <select
                        id="state"
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        className="input-field"
                      >
                        <option value="Karnataka">Karnataka</option>
                        <option value="Tamil Nadu">Tamil Nadu</option>
                        <option value="Maharashtra">Maharashtra</option>
                        <option value="Andhra Pradesh">Andhra Pradesh</option>
                        <option value="Gujarat">Gujarat</option>
                        <option value="Madhya Pradesh">Madhya Pradesh</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label htmlFor="latitude">Latitude *</label>
                      <input
                        id="latitude"
                        type="number"
                        step="0.000001"
                        min="-90"
                        max="90"
                        required
                        value={Number.isFinite(latitude) ? latitude : ""}
                        onChange={(e) => setLatitude(e.target.value === "" ? NaN : Number(e.target.value))}
                        className="input-field font-mono"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="longitude">Longitude *</label>
                      <input
                        id="longitude"
                        type="number"
                        step="0.000001"
                        min="-180"
                        max="180"
                        required
                        value={Number.isFinite(longitude) ? longitude : ""}
                        onChange={(e) => setLongitude(e.target.value === "" ? NaN : Number(e.target.value))}
                        className="input-field font-mono"
                      />
                    </div>
                  </div>
                  <span className="form-hint">Map center follows the typed coordinates.</span>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label htmlFor="total-area">Total Registered Area (Acres) *</label>
                      <input
                        id="total-area"
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={totalArea}
                        onChange={(e) => setTotalArea(e.target.value)}
                        className="input-field"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cultivable-area">Net Cultivable Area (Acres) *</label>
                      <input
                        id="cultivable-area"
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={cultivableArea}
                        onChange={(e) => setCultivableArea(e.target.value)}
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label htmlFor="terrain-type">Terrain &amp; Topography</label>
                      <select
                        id="terrain-type"
                        value={terrainType}
                        onChange={(e) => setTerrainType(e.target.value)}
                        className="input-field"
                      >
                        <option value="Flat Plain (0-1% slope)">Flat Plain (0-1% slope)</option>
                        <option value="Gentle Gradient (1-3% slope)">Gentle Gradient (1-3% slope)</option>
                        <option value="Rolling Undulating Hills">Rolling Undulating Hills</option>
                        <option value="Terraced Hillside">Terraced Hillside</option>
                        <option value="Valley Floor">Valley Floor</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="geofence">Geofence Attendance Radius (Meters)</label>
                      <input
                        id="geofence"
                        type="number"
                        min="100"
                        max="5000"
                        step="50"
                        value={geofenceRadius}
                        onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                        className="input-field font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <button type="button" onClick={() => setCurrentStep(1)} className="btn btn-secondary">
                  <Icons.ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <button type="submit" className="btn btn-green">
                  <span>Proceed to Soil &amp; Water</span>
                  <Icons.ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: SOIL SCIENCE BASELINE & WATER/POWER GRID */}
          {currentStep === 3 && (
            <div className="compact-card" style={{ padding: 28, gap: 20 }}>
              <div className="card-header" style={{ padding: 0 }}>
                <div>
                  <h2 className="section-title" style={{ margin: "0 0 4px", fontSize: "18px" }}>
                    Step 3: Soil Science Baseline, Water Resources &amp; Energy Grid
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
                    Laboratory soil benchmarks, borewell yield capacity, and electrical agricultural power feeders.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <div className="form-group">
                  <label htmlFor="soil-type">Primary Soil Classification *</label>
                  <select
                    id="soil-type"
                    value={soilType}
                    onChange={(e) => setSoilType(e.target.value)}
                    className="input-field"
                  >
                    <option value="Red Sandy Loam">Red Sandy Loam (High Aeration, Well Draining)</option>
                    <option value="Black Cotton Soil">Black Cotton Soil (Vertisol, High Moisture Retention)</option>
                    <option value="Alluvial Loam">Alluvial Loam (High Fertility River Basin)</option>
                    <option value="Laterite Red Soil">Laterite Red Soil (Acidic, Good for Plantation)</option>
                    <option value="Silty Clay Loam">Silty Clay Loam</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="soil-ph">Laboratory Soil pH Baseline</label>
                  <input
                    id="soil-ph"
                    type="number"
                    step="0.1"
                    min="3.0"
                    max="11.0"
                    placeholder="e.g. 6.8 (Neutral)"
                    value={soilPh}
                    onChange={(e) => setSoilPh(e.target.value)}
                    className="input-field font-mono"
                  />
                  <span className="form-hint">Optimal agricultural range: 6.2 - 7.5</span>
                </div>

                <div className="form-group">
                  <label htmlFor="soil-ec">Electrical Conductivity (EC dS/m)</label>
                  <input
                    id="soil-ec"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 0.45"
                    value={soilEc}
                    onChange={(e) => setSoilEc(e.target.value)}
                    className="input-field font-mono"
                  />
                  <span className="form-hint">&lt;1.0 dS/m indicates non-saline soil</span>
                </div>

                <div className="form-group">
                  <label htmlFor="soil-oc">Organic Carbon (OC %)</label>
                  <input
                    id="soil-oc"
                    type="number"
                    step="0.01"
                    placeholder="e.g. 0.75"
                    value={soilOrganicCarbon}
                    onChange={(e) => setSoilOrganicCarbon(e.target.value)}
                    className="input-field font-mono"
                  />
                  <span className="form-hint">&gt;0.75% indicates fertile organic baseline</span>
                </div>

                <div className="form-group">
                  <label htmlFor="water-source">Primary Water Resource</label>
                  <select
                    id="water-source"
                    value={waterSource}
                    onChange={(e) => setWaterSource(e.target.value)}
                    className="input-field"
                  >
                    <option value="Dedicated Agricultural Borewells">Dedicated Agricultural Borewells</option>
                    <option value="Open Irrigation Well / Baori">Open Irrigation Well / Baori</option>
                    <option value="Perennial River / Stream Lift">Perennial River / Stream Lift</option>
                    <option value="Canal Irrigation Branch (Scheduled)">Canal Irrigation Branch (Scheduled)</option>
                    <option value="Rainwater Harvesting Farm Pond">Rainwater Harvesting Farm Pond (Krishi Honda)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="borewell-count">Number of Active Borewells</label>
                  <input
                    id="borewell-count"
                    type="number"
                    min="0"
                    max="50"
                    placeholder="e.g. 2"
                    value={borewellCount}
                    onChange={(e) => setBorewellCount(e.target.value)}
                    className="input-field font-mono"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="borewell-depth">Average Borewell Depth (Feet)</label>
                  <input
                    id="borewell-depth"
                    type="number"
                    min="0"
                    max="3000"
                    placeholder="e.g. 650"
                    value={borewellDepthFeet}
                    onChange={(e) => setBorewellDepthFeet(e.target.value)}
                    className="input-field font-mono"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="water-yield">Discharge Yield (GPH or Inches)</label>
                  <input
                    id="water-yield"
                    type="number"
                    placeholder="e.g. 3200 (Gallons Per Hour)"
                    value={waterYieldGph}
                    onChange={(e) => setWaterYieldGph(e.target.value)}
                    className="input-field font-mono"
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="power-grid">Agricultural Electrical Supply *</label>
                  <select
                    id="power-grid"
                    value={electricitySupply}
                    onChange={(e) => setElectricitySupply(e.target.value)}
                    className="input-field"
                  >
                    <option value="3-Phase Agricultural Dedicated Feeder">3-Phase Dedicated Agricultural Feeder (Govt Subsidized/Tariff)</option>
                    <option value="Dedicated 25kVA Step-Down Transformer">Dedicated 25kVA / 63kVA Step-Down Transformer on 11kV line</option>
                    <option value="Solar PV Agri Pumping System (10HP Off-Grid)">Solar PV Agri Pumping System (10HP - 20HP Off-Grid)</option>
                    <option value="Diesel Generator Backup (DG Set 25kVA)">Diesel Generator Backup (DG Set 25kVA - 50kVA)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <button type="button" onClick={() => setCurrentStep(2)} className="btn btn-secondary">
                  <Icons.ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <button type="submit" className="btn btn-green">
                  <span>Proceed to Turnkey Scope</span>
                  <Icons.ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4: TURNKEY SCOPE, CIVIL WORKS & INITIAL PARCEL */}
          {currentStep === 4 && (
            <div className="compact-card" style={{ padding: 28, gap: 20 }}>
              <div className="card-header" style={{ padding: 0 }}>
                <div>
                  <h2 className="section-title" style={{ margin: "0 0 4px", fontSize: "18px" }}>
                    Step 4: Turnkey Scope, Civil Works &amp; Initial Demarcated Parcel
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
                    Boundary security fencing, internal road access, proposed crop varieties, and initial parcel demarcation.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <div className="form-group">
                  <label htmlFor="fencing-type">Boundary Security &amp; Fencing</label>
                  <select
                    id="fencing-type"
                    value={fencingType}
                    onChange={(e) => setFencingType(e.target.value)}
                    className="input-field"
                  >
                    <option value="Heavy-Duty Chainlink Fence (6ft / 8ft GI with RCC posts)">Heavy-Duty Chainlink Fence (6ft/8ft GI with RCC posts)</option>
                    <option value="Solar High-Voltage Security Electric Fence">Solar High-Voltage Security Electric Fence</option>
                    <option value="Barbed Wire 8-Strand with Granite Pillars">Barbed Wire 8-Strand with Granite Pillars</option>
                    <option value="Stone Wall Compound">Natural Stone Compound Wall</option>
                    <option value="Living Bio-Fence">Living Bio-Fence (Bougainvillea / Bamboo)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="road-specs">Internal Tractor Access Roads</label>
                  <select
                    id="road-specs"
                    value={roadSpecs}
                    onChange={(e) => setRoadSpecs(e.target.value)}
                    className="input-field"
                  >
                    <option value="WBM All-Weather Tractor Road">WBM All-Weather Tractor Road (12ft width)</option>
                    <option value="Murrum Graded Farm Track">Murrum Graded Farm Track</option>
                    <option value="Concrete Paved Farmyard &amp; Tractor Ramp">Concrete Paved Farmyard &amp; Tractor Ramp</option>
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="proposed-crops">Proposed Plantation &amp; Cropping Architecture</label>
                  <input
                    id="proposed-crops"
                    type="text"
                    placeholder="e.g. High-Density Mango (Alphonso), Hass Avocado, Dragonfruit, Turmeric"
                    value={proposedCrops}
                    onChange={(e) => setProposedCrops(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="plot-name">Initial Management Plot / Zone Name *</label>
                  <input
                    id="plot-name"
                    type="text"
                    placeholder="e.g. Zone A - Primary Orchard Block"
                    value={initialPlotName}
                    onChange={(e) => setInitialPlotName(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="plot-area">Plot Demarcated Area (Acres)</label>
                  <input
                    id="plot-area"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 5.0"
                    value={initialPlotArea}
                    onChange={(e) => setInitialPlotArea(e.target.value)}
                    className="input-field font-mono"
                  />
                  <span className="form-hint">Available: {cultivableArea || totalArea} cultivable acres</span>
                </div>

                <div className="form-group">
                  <label htmlFor="irrigation">Plot Irrigation Infrastructure</label>
                  <select
                    id="irrigation"
                    value={initialIrrigationType}
                    onChange={(e) => setInitialIrrigationType(e.target.value)}
                    className="input-field"
                  >
                    <option value="Drip">Inline Pressure-Compensating (PC) Drip System</option>
                    <option value="Sprinkler">Micro-Sprinkler Overhead Canopy System</option>
                    <option value="Rain Pipe">Rain Pipe High-Density Spray</option>
                    <option value="Flood">Flood &amp; Furrow Basin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <button type="button" onClick={() => setCurrentStep(3)} className="btn btn-secondary">
                  <Icons.ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <button type="submit" className="btn btn-green">
                  <span>Proceed to Commercials &amp; Credentials</span>
                  <Icons.ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 5: COMMERCIAL GOVERNANCE, SLAS & CREDENTIALS HANDOVER */}
          {currentStep === 5 && (
            <div className="compact-card" style={{ padding: 28, gap: 20 }}>
              <div className="card-header" style={{ padding: 0 }}>
                <div>
                  <h2 className="section-title" style={{ margin: "0 0 4px", fontSize: "18px" }}>
                    Step 5: Commercial Governance, SLAs &amp; Credentials Handover
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
                    Contract reference, milestone target handover date, assigned project agronomist, and owner security credentials.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <div className="form-group">
                  <label htmlFor="contract-ref">Turnkey Work Order / Contract Ref No.</label>
                  <input
                    id="contract-ref"
                    type="text"
                    placeholder="e.g. AGAATE-WO-2026-0891"
                    value={contractRef}
                    onChange={(e) => setContractRef(e.target.value)}
                    className="input-field font-mono"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contract-val">Total Turnkey Project Value (INR ₹)</label>
                  <input
                    id="contract-val"
                    type="number"
                    placeholder="e.g. 4500000"
                    value={contractValue}
                    onChange={(e) => setContractValue(e.target.value)}
                    className="input-field font-mono"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="target-date">Milestone Target Handover Date (SLA)</label>
                  <input
                    id="target-date"
                    type="date"
                    value={targetHandoverDate}
                    onChange={(e) => setTargetHandoverDate(e.target.value)}
                    className="input-field font-mono"
                  />
                  <span className="form-hint">Standard turnkey SLA: 90 days from groundbreaking</span>
                </div>

                <div className="form-group">
                  <label htmlFor="assign-agronomist">Designated Project Agronomist / Engineer</label>
                  <select
                    id="assign-agronomist"
                    value={selectedAgronomistId}
                    onChange={(e) => setSelectedAgronomistId(e.target.value)}
                    className="input-field"
                  >
                    <option value="">-- Select Dedicated Agronomist --</option>
                    {agronomistList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label htmlFor="owner-pass">Client Initial Secure Password *</label>
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="btn btn-link"
                      style={{ fontSize: "12px", padding: 0 }}
                    >
                      Regenerate Strong Password
                    </button>
                  </div>
                  <input
                    id="owner-pass"
                    type="text"
                    required
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                    placeholder="Click regenerate or enter custom password"
                    className="input-field font-mono"
                  />
                  <span className="form-hint">This password will be displayed on the printable handover voucher.</span>
                </div>
              </div>

              {/* Readiness review — every stage states complete / incomplete /
                  awaiting verification / manual check before submit. */}
              <div style={{ padding: 16, borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Readiness review
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, fontSize: "12px" }}>
                  {readiness.map((r) => (
                    <div key={r.label} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontWeight: 700, color: "var(--ink)" }}>{r.label}: <span style={{ color: r.state === "Complete" ? "var(--green-ink)" : "var(--amber)" }}>{r.state}</span></span>
                      <span style={{ color: "var(--muted)" }}>{r.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technical Dossier Preview Card */}
              <div style={{ padding: 16, borderRadius: "var(--radius-sm)", background: "var(--surface-strong)" }}>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  📋 Summary Dossier for Activation:
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, fontSize: "12px", color: "var(--muted)" }}>
                  <div>🏢 Entity: <strong style={{ color: "var(--ink)" }}>{companyName || ownerName}</strong> ({entityType})</div>
                  <div>👤 Signatory: <strong style={{ color: "var(--ink)" }}>{ownerName}</strong></div>
                  <div>📱 Mobile: <strong style={{ color: "var(--ink)" }}>{ownerPhone || "None"}</strong></div>
                  <div>✉️ Email: <strong style={{ color: "var(--ink)" }}>{ownerEmail || "Auto-generated"}</strong></div>
                  <div>🌾 Estate: <strong style={{ color: "var(--ink)" }}>{farmName}</strong> ({totalArea} Ac)</div>
                  <div>📍 Cadastral: <strong style={{ color: "var(--ink)" }}>{surveyNumber ? `Sy #${surveyNumber}` : "Pending Sy #"}</strong></div>
                  <div>🧪 Soil pH: <strong style={{ color: "var(--ink)" }}>{soilPh} ({soilType})</strong></div>
                  <div>💧 Water: <strong style={{ color: "var(--ink)" }}>{borewellCount} Borewells ({waterYieldGph} GPH)</strong></div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <button type="button" onClick={() => setCurrentStep(4)} className="btn btn-secondary">
                  <Icons.ChevronLeft size={16} />
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
      )}
    </div>
  );
}
