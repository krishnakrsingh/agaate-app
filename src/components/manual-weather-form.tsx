"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { FormEvent, useEffect, useState } from "react";
import { Icons } from "./icons";
import { useToast } from "./ui/toast";

type Farm = { id: string; name: string };
type Manual = {
  temperature?: string | null;
  humidity?: string | null;
  windSpeed?: string | null;
  rainForecast?: string | null;
  remarks?: string | null;
  notes?: string | null;
} | null;

export function ManualWeatherForm({ farmId: fixedFarmId }: { farmId?: string }) {
  const toast = useToast();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState(fixedFarmId ?? "");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [existing, setExisting] = useState<Manual>(null);
  const [auto, setAuto] = useState<string>("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (fixedFarmId) {
      setFarmId(fixedFarmId);
      return;
    }
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: Farm[]) => {
        setFarms(list);
        if (list.length > 0) setFarmId(list[0].id);
      })
      .catch(() => setMessage("Unable to load farms."));
  }, [fixedFarmId]);

  function load() {
    if (!farmId || !date) return;
    setMessage("");

    fetch(`/api/weather?farmId=${farmId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Weather unavailable");
        return r.json();
      })
      .then((v) =>
        setAuto(
          `${v.current?.temperature_2m ?? "—"}°C · ${v.current?.relative_humidity_2m ?? "—"}% humidity · ${v.current?.wind_speed_10m ?? "—"} km/h wind`
        )
      )
      .catch((e) => setAuto(e instanceof Error ? e.message : "Weather unavailable"));

    fetch(`/api/weather/manual?farmId=${farmId}&date=${date}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((v) => {
        if (v?.manual) setExisting(v.manual);
        else setExisting(null);
      })
      .catch(() => setExisting(null));
  }

  useEffect(() => {
    if (farmId && date) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, date]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");

    const f = new FormData(e.currentTarget);
    const payload: Record<string, unknown> = {
      farmId,
      date: f.get("date"),
      temperature: f.get("temperature") ? Number(f.get("temperature")) : null,
      humidity: f.get("humidity") ? Number(f.get("humidity")) : null,
      windSpeed: f.get("windSpeed") ? Number(f.get("windSpeed")) : null,
      rainForecast: f.get("rainForecast") ? Number(f.get("rainForecast")) : null,
      remarks: (String(f.get("remarks") ?? "").trim() || null) as string | null,
      notes: (String(f.get("notes") ?? "").trim() || null) as string | null,
    };

    try {
      const res = await fetch("/api/weather/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setPending(false);
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        const err = body.error ?? "Unable to save manual weather.";
        setMessage(err);
        toast.error(err);
        return;
      }

      toast.success("Manual weather recorded for agronomy decision-making.");
      setMessage("Manual weather recorded for agronomy decision-making.");
      load();
    } catch {
      setPending(false);
      setMessage("Network error.");
      toast.error("Network error.");
    }
  }

  return (
    <article className="card" style={{ margin: 0 }}>
      <div className="card-header" style={{ marginBottom: 12 }}>
        <div>
          <h3>Agronomist Weather Override</h3>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Record on-site micro-climate observations or rain forecasts for 7-day agronomy planning.
          </p>
        </div>
        <span className="role-badge agronomist" style={{ fontSize: "0.68rem" }}>
          Agronomy Override
        </span>
      </div>

      <form className="form two-column" onSubmit={submit}>
        {!fixedFarmId && (
          <div className="form-group">
            <label>Farm</label>
            <select value={farmId} onChange={(e) => setFarmId(e.target.value)} required>
              <option value="">Select farm</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label>Plan Date</label>
          <input
            name="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        {/* Live Auto Weather vs Stored Manual */}
        <div
          className="wide"
          style={{
            background: "var(--slate-50)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
            fontSize: "0.88rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--sky-blue)", fontWeight: 600 }}>
            <Icons.Sun size={15} />
            <span>Auto Satellite (Live):</span>
            <span style={{ color: "var(--text-main)", fontWeight: 500 }}>{auto || "Fetching…"}</span>
          </div>

          {existing && (
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--border-subtle)", color: "var(--primary-800)" }}>
              <strong>Stored Manual Override:</strong> {existing.temperature ?? "—"}°C &bull; {existing.humidity ?? "—"}% humidity &bull; {existing.windSpeed ?? "—"} km/h wind &bull; Rain: {existing.rainForecast ?? "—"}%
              {existing.remarks && <span style={{ display: "block", fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>Remarks: {existing.remarks}</span>}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Observed Temperature (°C)</label>
          <input
            name="temperature"
            type="number"
            step="0.1"
            min="-50"
            max="60"
            placeholder={existing?.temperature?.toString() ?? "e.g., 31.5"}
          />
        </div>

        <div className="form-group">
          <label>Observed Humidity (%)</label>
          <input
            name="humidity"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder={existing?.humidity?.toString() ?? "e.g., 65"}
          />
        </div>

        <div className="form-group">
          <label>Wind speed (km/h)</label>
          <input
            name="windSpeed"
            type="number"
            step="0.1"
            min="0"
            max="200"
            placeholder={existing?.windSpeed?.toString() ?? "e.g., 14"}
          />
        </div>

        <div className="form-group">
          <label>Rain forecast (%)</label>
          <input
            name="rainForecast"
            type="number"
            step="0.1"
            min="0"
            max="100"
            placeholder={existing?.rainForecast?.toString() ?? "e.g., 40"}
          />
        </div>

        <div className="form-group wide">
          <label>Weather Remarks & Agronomy Context</label>
          <textarea
            name="remarks"
            maxLength={500}
            defaultValue={existing?.remarks ?? ""}
            placeholder="e.g., Heavy morning dew observed, high humidity favouring fungal growth"
            rows={2}
          />
        </div>

        <div className="form-group wide">
          <label>Agronomy Plan Notes (Optional)</label>
          <textarea
            name="notes"
            maxLength={2000}
            defaultValue={existing?.notes ?? ""}
            placeholder="e.g., Adjust fertigation timing to late afternoon due to midday heat"
            rows={2}
          />
        </div>

        {message && (
          <div className={message.includes("recorded") ? "hint wide" : "error wide"} role="status">
            {message.includes("recorded") ? <Icons.CheckCircle size={16} /> : <Icons.AlertCircle size={16} />}
            <span>{message}</span>
          </div>
        )}

        <button type="submit" className="btn btn-primary wide" disabled={pending || !farmId}>
          <Icons.Check size={16} />
          <span>{pending ? "Saving override…" : "Save Agronomy Weather"}</span>
        </button>
      </form>
    </article>
  );
}
