"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { InteractiveFarmMap, BoundaryPoint } from "./interactive-farm-map";

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
  { id: 1, title: "Client Profile", desc: "Owner identity & contacts" },
  { id: 2, title: "Farm & Geo-Map", desc: "Satellite coordinates & acreage" },
  { id: 3, title: "Plots & Irrigation", desc: "Demarcation & water systems" },
  { id: 4, title: "Credentials Handover", desc: "Login voucher & activation" },
];

export function ClientOnboardingWizardV2() {
  const router = useRouter();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);

  // Step 1: Client Profile Details
  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerDob, setOwnerDob] = useState("");
  const [secondaryContact, setSecondaryContact] = useState("");

  // Step 2: Farm & Interactive Map Details
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState(13.4325);
  const [longitude, setLongitude] = useState(77.7275);
  const [totalArea, setTotalArea] = useState("25");
  const [cultivableArea, setCultivableArea] = useState("22.5");
  const [waterSource, setWaterSource] = useState("3x 15HP Borewells with automated filtration");
  const [soilType, setSoilType] = useState("Red Sandy Loam");
  const [geofenceRadius, setGeofenceRadius] = useState(600);
  const [boundaryPoints, setBoundaryPoints] = useState<BoundaryPoint[]>([]);

  // Step 3: Plots & Infrastructure
  const [initialPlotName, setInitialPlotName] = useState("Block Alpha - Pomegranate");
  const [initialPlotArea, setInitialPlotArea] = useState("10.0");
  const [initialIrrigationType, setInitialIrrigationType] = useState("Drip");

  // Step 4: Handover & Security
  const [ownerPassword, setOwnerPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [handover, setHandover] = useState<HandoverData | null>(null);
  const [copied, setCopied] = useState(false);

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
      if (!farmName.trim() || !location.trim()) {
        toast.show("Please provide the farm name and location region", "error");
        return;
      }
      if (Number(cultivableArea) > Number(totalArea)) {
        toast.show("Cultivable area cannot exceed total estate acreage", "error");
        return;
      }
      setCurrentStep(3);
    } else if (currentStep === 3) {
      if (!ownerPassword) {
        generatePassword();
      }
      setCurrentStep(4);
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
        farmName: farmName.trim(),
        location: location.trim(),
        address: address.trim() || null,
        latitude: Number(latitude),
        longitude: Number(longitude),
        totalArea: Number(totalArea),
        cultivableArea: Number(cultivableArea),
        waterSource: waterSource.trim(),
        soilType: soilType.trim(),
        geofenceRadiusMeters: Number(geofenceRadius),
        boundaryGeoJson: boundaryPoints.length > 0 ? JSON.stringify(boundaryPoints) : null,
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim() || null,
        ownerEmail: ownerEmail.trim() || null,
        ownerDob: ownerDob || null,
        ownerPassword: ownerPassword.trim(),
        initialPlotName: initialPlotName.trim() || null,
        initialPlotArea: initialPlotArea ? Number(initialPlotArea) : null,
        initialIrrigationType,
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
        farmId: data.farm.id,
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

        {/* Step Progress Bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 20 }}>
          {STEPS.map((step) => {
            const isDone = currentStep > step.id || handover !== null;
            const isCurrent = currentStep === step.id && !handover;
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
                    ? "rgba(16, 185, 129, 0.12)"
                    : isDone
                    ? "rgba(255, 255, 255, 0.04)"
                    : "transparent",
                  border: isCurrent
                    ? "1px solid var(--brand)"
                    : isDone
                    ? "1px solid rgba(52, 211, 153, 0.3)"
                    : "1px solid var(--border-subtle)",
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
                      ? "var(--brand)"
                      : isCurrent
                      ? "rgba(16, 185, 129, 0.2)"
                      : "var(--surface-muted)",
                    color: isDone ? "#022c1e" : isCurrent ? "var(--brand)" : "var(--muted-fg)",
                  }}
                >
                  {isDone ? <Icons.Check size={12} /> : step.id}
                </div>
                <div style={{ overflow: "hidden" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: isCurrent ? "var(--fg)" : "var(--muted-fg)", whiteSpace: "nowrap" }}>
                    {step.title}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--muted-fg)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {step.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* HANDOVER VOUCHER */}
      {handover && (
        <div className="compact-card" style={{ padding: 32, gap: 24, border: "1px solid var(--brand)", background: "rgba(16, 185, 129, 0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(16, 185, 129, 0.15)",
                color: "var(--brand)",
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
              background: "var(--surface-muted)",
              border: "1px dashed var(--brand)",
              fontFamily: "monospace",
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
            }}
          >
            <div>
              <div style={{ fontSize: "11px", color: "var(--muted-fg)" }}>ESTATE NAME</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--fg)" }}>{handover.estateName}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--muted-fg)" }}>CLIENT OWNER</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--fg)" }}>{handover.clientName}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--muted-fg)" }}>LOGIN IDENTIFIER</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#34d399" }}>{handover.loginIdentifier}</div>
            </div>
            <div>
              <div style={{ fontSize: "11px", color: "var(--muted-fg)" }}>INITIAL PASSWORD</div>
              <div style={{ fontSize: "14px", fontWeight: 700, color: "#fbbf24" }}>{handover.initialPassword}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <button type="button" onClick={copyHandoverVoucher} className="btn btn-green">
              <Icons.Copy size={16} />
              <span>{copied ? "Copied Voucher!" : "Copy Access Voucher"}</span>
            </button>
            <button type="button" onClick={shareViaWhatsApp} className="btn btn-secondary" style={{ color: "#25D366" }}>
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
        <form onSubmit={currentStep === 4 ? handleSubmit : handleNext}>
          {/* SCREEN 1: CLIENT IDENTITY */}
          {currentStep === 1 && (
            <div className="compact-card" style={{ padding: 28, gap: 20 }}>
              <div className="card-header" style={{ padding: 0 }}>
                <div>
                  <h2 className="section-title" style={{ margin: "0 0 4px", fontSize: "18px" }}>
                    Step 1: Client Owner Profile & Contacts
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
                    The client will be created as Farm Admin with full authority over this estate.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <div className="form-group">
                  <label htmlFor="owner-name">Client Full Name *</label>
                  <input
                    id="owner-name"
                    type="text"
                    required
                    placeholder="e.g. Ramesh Chandra Singhania"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
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
                  />
                  <span className="form-hint">Client can use this mobile number to log in directly.</span>
                </div>

                <div className="form-group">
                  <label htmlFor="owner-email">Email Address (Optional)</label>
                  <input
                    id="owner-email"
                    type="email"
                    placeholder="e.g. ramesh@singhaniafarms.in"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="owner-dob">Date of Birth (DOB)</label>
                  <input
                    id="owner-dob"
                    type="date"
                    value={ownerDob}
                    onChange={(e) => setOwnerDob(e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                  <label htmlFor="sec-contact">Emergency / Secondary Contact (Optional)</label>
                  <input
                    id="sec-contact"
                    type="text"
                    placeholder="e.g. Manager Suresh: +91 9448123456"
                    value={secondaryContact}
                    onChange={(e) => setSecondaryContact(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
                <button type="submit" className="btn btn-green">
                  <span>Proceed to Farm & Map</span>
                  <Icons.ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 2: FARM LOCATION & CRAZY TACTICAL MAP */}
          {currentStep === 2 && (
            <div className="compact-card" style={{ padding: 28, gap: 20 }}>
              <div className="card-header" style={{ padding: 0 }}>
                <div>
                  <h2 className="section-title" style={{ margin: "0 0 4px", fontSize: "18px" }}>
                    Step 2: Farm Estate Location & Coordinate Map
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
                    Drop the farm HQ pin, adjust boundary polygon vertices, and configure acreage.
                  </p>
                </div>
              </div>

              {/* Split layout: Interactive Map on Left, Parameters on Right */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 24, alignItems: "start" }}>
                {/* Left: Tactical Map */}
                <div style={{ background: "var(--surface-muted)", padding: 16, borderRadius: "var(--radius-md)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--fg)" }}>
                      Tactical Satellite & Parcel Visualizer
                    </div>
                    <span className="badge badge-green" style={{ fontSize: "10px" }}>Interactive</span>
                  </div>

                  <InteractiveFarmMap
                    latitude={latitude}
                    longitude={longitude}
                    radiusMeters={geofenceRadius}
                    boundaryPoints={boundaryPoints}
                    onCoordinatesChange={(lat, lng) => {
                      setLatitude(lat);
                      setLongitude(lng);
                    }}
                    onRadiusChange={(r) => setGeofenceRadius(r)}
                    onBoundaryChange={(pts) => setBoundaryPoints(pts)}
                  />
                </div>

                {/* Right: Farm Specs Form */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="form-group">
                    <label htmlFor="farm-name">Farm Estate Name *</label>
                    <input
                      id="farm-name"
                      type="text"
                      required
                      placeholder="e.g. Sunrise Organic Pomegranate Estate"
                      value={farmName}
                      onChange={(e) => setFarmName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="farm-location">Region & District *</label>
                    <input
                      id="farm-location"
                      type="text"
                      required
                      placeholder="e.g. Chikkaballapur District, Karnataka"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label htmlFor="total-area">Total Area (Acres) *</label>
                      <input
                        id="total-area"
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={totalArea}
                        onChange={(e) => setTotalArea(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="cultivable-area">Cultivable Area (Acres) *</label>
                      <input
                        id="cultivable-area"
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={cultivableArea}
                        onChange={(e) => setCultivableArea(e.target.value)}
                      />
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    <div className="form-group">
                      <label htmlFor="soil-type">Primary Soil Type</label>
                      <select
                        id="soil-type"
                        value={soilType}
                        onChange={(e) => setSoilType(e.target.value)}
                      >
                        <option value="Red Sandy Loam">Red Sandy Loam</option>
                        <option value="Black Cotton Soil">Black Cotton Soil</option>
                        <option value="Alluvial Clay Loam">Alluvial Clay Loam</option>
                        <option value="Laterite Red Soil">Laterite Red Soil</option>
                        <option value="Silty Clay">Silty Clay</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor="geofence">Attendance Geofence (Meters)</label>
                      <input
                        id="geofence"
                        type="number"
                        min="100"
                        max="5000"
                        step="50"
                        value={geofenceRadius}
                        onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="water-source">Water Source & Irrigation Pumping</label>
                    <input
                      id="water-source"
                      type="text"
                      placeholder="e.g. 3x 20HP Borewells, 1.5 Cr Liter farm pond"
                      value={waterSource}
                      onChange={(e) => setWaterSource(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <button type="button" onClick={() => setCurrentStep(1)} className="btn btn-secondary">
                  <Icons.ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <button type="submit" className="btn btn-green">
                  <span>Proceed to Plots</span>
                  <Icons.ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 3: INITIAL PLOT DEMARCATION */}
          {currentStep === 3 && (
            <div className="compact-card" style={{ padding: 28, gap: 20 }}>
              <div className="card-header" style={{ padding: 0 }}>
                <div>
                  <h2 className="section-title" style={{ margin: "0 0 4px", fontSize: "18px" }}>
                    Step 3: Initial Agricultural Plot Demarcation
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
                    Demarcate the first management block/parcel for this estate. Additional plots can be added later by the Farm Owner.
                  </p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
                <div className="form-group">
                  <label htmlFor="plot-name">Initial Plot Name / Number</label>
                  <input
                    id="plot-name"
                    type="text"
                    placeholder="e.g. Zone A - Primary Orchard"
                    value={initialPlotName}
                    onChange={(e) => setInitialPlotName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="plot-area">Plot Area (Acres)</label>
                  <input
                    id="plot-area"
                    type="number"
                    step="0.1"
                    placeholder="e.g. 5.0"
                    value={initialPlotArea}
                    onChange={(e) => setInitialPlotArea(e.target.value)}
                  />
                  <span className="form-hint">Max available: {cultivableArea} cultivable acres</span>
                </div>

                <div className="form-group">
                  <label htmlFor="irrigation">Plot Irrigation Configuration</label>
                  <select
                    id="irrigation"
                    value={initialIrrigationType}
                    onChange={(e) => setInitialIrrigationType(e.target.value)}
                  >
                    <option value="Drip">Drip Irrigation (Inline pressure-compensating)</option>
                    <option value="Sprinkler">Micro Sprinkler System</option>
                    <option value="Rain Pipe">Rain Pipe Spray</option>
                    <option value="Flood">Flood / Furrow Basin</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <button type="button" onClick={() => setCurrentStep(2)} className="btn btn-secondary">
                  <Icons.ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <button type="submit" className="btn btn-green">
                  <span>Proceed to Credentials</span>
                  <Icons.ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* SCREEN 4: CREDENTIALS GENERATION & ACTIVATION */}
          {currentStep === 4 && (
            <div className="compact-card" style={{ padding: 28, gap: 20 }}>
              <div className="card-header" style={{ padding: 0 }}>
                <div>
                  <h2 className="section-title" style={{ margin: "0 0 4px", fontSize: "18px" }}>
                    Step 4: Client Owner Credentials & Final Activation
                  </h2>
                  <p className="muted" style={{ margin: 0, fontSize: "13px" }}>
                    Set up secure login credentials for the client. The client will use their mobile number or email with this password.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="form-group">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                    <label htmlFor="owner-pass">Initial Secure Password *</label>
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
                  />
                  <span className="form-hint">This password will be displayed on the handover card for the client.</span>
                </div>

                <div style={{ padding: 16, borderRadius: "var(--radius-sm)", background: "var(--surface-muted)", border: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--fg)", marginBottom: 8 }}>
                    Summary of Account Being Provisioned:
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8, fontSize: "12px", color: "var(--muted-fg)" }}>
                    <div>👤 Client: <strong style={{ color: "var(--fg)" }}>{ownerName}</strong></div>
                    <div>📱 Mobile: <strong style={{ color: "var(--fg)" }}>{ownerPhone || "None"}</strong></div>
                    <div>✉️ Email: <strong style={{ color: "var(--fg)" }}>{ownerEmail || "Auto-generated"}</strong></div>
                    <div>🌾 Estate: <strong style={{ color: "var(--fg)" }}>{farmName}</strong> ({totalArea} Acres)</div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <button type="button" onClick={() => setCurrentStep(3)} className="btn btn-secondary">
                  <Icons.ChevronLeft size={16} />
                  <span>Back</span>
                </button>
                <button type="submit" disabled={pending} className="btn btn-green btn-lg">
                  <Icons.Check size={16} />
                  <span>{pending ? "Provisioning Estate…" : "Activate & Generate Handover Voucher"}</span>
                </button>
              </div>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
