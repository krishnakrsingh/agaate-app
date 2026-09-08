"use client";
import { useState, FormEvent } from "react";
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

export function ClientOnboardingWizard({
  agronomists = [],
}: {
  agronomists: Agronomist[];
}) {
  const router = useRouter();
  const toast = useToast();

  // Form states
  const [farmName, setFarmName] = useState("");
  const [location, setLocation] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState("12.9716");
  const [longitude, setLongitude] = useState("77.5946");
  const [totalArea, setTotalArea] = useState("10");
  const [cultivableArea, setCultivableArea] = useState("8.5");
  const [waterSource, setWaterSource] = useState("2x 15HP Borewells with automated filtration");
  const [geofenceRadius, setGeofenceRadius] = useState("600");

  // Client Owner Credentials
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");

  // Agronomist & Initial Plot
  const [agronomistId, setAgronomistId] = useState(agronomists[0]?.id || "");
  const [initialPlotName, setInitialPlotName] = useState("Zone A - Primary Block");
  const [initialPlotArea, setInitialPlotArea] = useState("4.0");
  const [initialIrrigationType, setInitialIrrigationType] = useState("Drip");

  // Submission & Handover states
  const [pending, setPending] = useState(false);
  const [handover, setHandover] = useState<HandoverData | null>(null);

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$";
    let pass = "";
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setOwnerPassword(pass);
  };

  const captureGps = () => {
    if (!navigator.geolocation) {
      toast.show("Geolocation is not supported by your browser", "error");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast.show("Captured GPS coordinates from current location", "success");
      },
      () => {
        toast.show("Unable to capture GPS location. Enter coordinates manually.", "error");
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (Number(cultivableArea) > Number(totalArea)) {
      toast.show("Cultivable area cannot exceed total estate acreage.", "error");
      return;
    }

    setPending(true);
    try {
      const body = {
        farmName,
        location,
        address,
        latitude: Number(latitude),
        longitude: Number(longitude),
        totalArea: Number(totalArea),
        cultivableArea: Number(cultivableArea),
        waterSource,
        geofenceRadiusMeters: Number(geofenceRadius),
        ownerName,
        ownerEmail,
        ownerPassword,
        agronomistId: agronomistId || null,
        initialPlotName,
        initialPlotArea: initialPlotArea ? Number(initialPlotArea) : null,
        initialIrrigationType,
      };

      const res = await fetch("/api/admin/onboard-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to onboard client estate");
      }

      const data = await res.json();
      setHandover({
        ...data.handover,
        farmId: data.farm.id,
      });
      toast.show("Estate onboarded and client credentials provisioned!", "success");
    } catch (err: any) {
      toast.show(err.message || "Onboarding failed", "error");
    } finally {
      setPending(false);
    }
  };

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
    toast.show("Client Handover Card copied to clipboard!", "success");
  };

  if (handover) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto">
            <Icons.CheckCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white">Client Estate Provisioned Successfully!</h2>
          <p className="text-xs text-zinc-400">
            The farm is active, initial plot is demarcated, and client owner credentials are live.
          </p>
        </div>

        {/* Handover Card */}
        <div className="p-5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
            <span className="text-emerald-400 font-bold uppercase tracking-wider">Client Handover Voucher</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded">
              Ready to Share
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-zinc-300">
            <div>
              <span className="text-zinc-500 block text-[11px]">Estate Name</span>
              <span className="font-semibold text-white">{handover.estateName}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Client Owner</span>
              <span className="font-semibold text-white">{handover.clientName}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Login Email</span>
              <span className="font-semibold text-emerald-400">{handover.clientEmail}</span>
            </div>
            <div>
              <span className="text-zinc-500 block text-[11px]">Initial Password</span>
              <span className="font-semibold text-amber-400">{handover.initialPassword}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={copyHandoverText}
            className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-zinc-700 transition-colors"
          >
            <Icons.ClipboardList className="w-4 h-4 text-emerald-400" />
            Copy for WhatsApp / Email
          </button>

          <Link
            href={`/farms/${handover.farmId}`}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-sm text-center"
          >
            Manage Estate <Icons.ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Icons.Farm className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Client Estate Provisioning Wizard</h1>
            <p className="text-xs text-zinc-400">
              Agaate Super Admin portal: Onboard client land, provision owner credentials, and assign agronomy oversight.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6 shadow-xl">
        {/* Section 1: Estate Identity */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <span>Step 1: Estate Identity & Acreage</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Estate / Farmland Name *</label>
              <input
                type="text"
                value={farmName}
                onChange={(e) => setFarmName(e.target.value)}
                placeholder="e.g. Kaveri Green Agro Farms"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">District / Region *</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Mandya, Karnataka"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Total Land (Acres) *</label>
              <input
                type="number"
                step="0.1"
                value={totalArea}
                onChange={(e) => setTotalArea(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Cultivable (Acres) *</label>
              <input
                type="number"
                step="0.1"
                value={cultivableArea}
                onChange={(e) => setCultivableArea(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Longitude</label>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.000001"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={captureGps}
                  title="Capture current device location"
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg border border-zinc-700"
                >
                  <Icons.Zap className="w-4 h-4 text-emerald-400" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Client Owner Credentials */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <span>Step 2: Client Owner (Farm Admin) Credentials</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Client Full Name *</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Ramesh Patel"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Client Email (Login ID) *</label>
              <input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="e.g. ramesh@clientfarm.com"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-zinc-300">Initial Password *</label>
                <button
                  type="button"
                  onClick={generatePassword}
                  className="text-[10px] text-emerald-400 hover:underline"
                >
                  Generate
                </button>
              </div>
              <input
                type="text"
                value={ownerPassword}
                onChange={(e) => setOwnerPassword(e.target.value)}
                placeholder="Min 8 characters"
                required
                minLength={8}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Dedicated Agronomist & Initial Plot */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-zinc-800 text-xs font-bold uppercase tracking-wider text-emerald-400">
            <span>Step 3: Agronomist Assignment & Initial Plot</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Assign Dedicated Agronomist</label>
              <select
                value={agronomistId}
                onChange={(e) => setAgronomistId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Assign Later --</option>
                {agronomists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Initial Plot Name</label>
              <input
                type="text"
                value={initialPlotName}
                onChange={(e) => setInitialPlotName(e.target.value)}
                placeholder="e.g. Block A - Polyhouse 1"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Initial Plot Area (Acres)</label>
              <input
                type="number"
                step="0.1"
                value={initialPlotArea}
                onChange={(e) => setInitialPlotArea(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Primary Irrigation</label>
              <select
                value={initialIrrigationType}
                onChange={(e) => setInitialIrrigationType(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="Drip">Drip Irrigation</option>
                <option value="Sprinkler">Sprinkler</option>
                <option value="Rain Pipe">Rain Pipe</option>
                <option value="Flood">Flood / Channel</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Icons.Spinner className="w-4 h-4 animate-spin" />
              Provisioning Client Farmland...
            </>
          ) : (
            <>
              <Icons.CheckCircle className="w-4 h-4" />
              Provision Estate &amp; Issue Client Credentials
            </>
          )}
        </button>
      </form>
    </div>
  );
}
