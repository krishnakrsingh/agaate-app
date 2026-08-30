"use client";
import { useEffect, useState } from "react";
import { Icons } from "./icons";

type Weather = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    wind_speed_10m?: number;
    time?: string;
  };
  daily?: {
    precipitation_probability_max?: number[];
  };
};

export function WeatherCard({ farmId }: { farmId: string }) {
  const [weather, setWeather] = useState<Weather | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/weather?farmId=${farmId}`)
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error ?? "Live weather is unavailable.");
        }
        return r.json();
      })
      .then((v) => {
        if (!cancelled) {
          setWeather(v);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [farmId]);

  return (
    <article className="card" style={{ margin: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <div>
        <div className="card-header" style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="metric-icon-box blue" style={{ width: 32, height: 32 }}>
              <Icons.Sun size={18} />
            </div>
            <h3 style={{ margin: 0 }}>Live Telemetry Forecast</h3>
          </div>
          <span className="status active" style={{ fontSize: "0.68rem" }}>Open-Meteo Live</span>
        </div>

        {error ? (
          <p className="muted" style={{ fontSize: "0.85rem", color: "var(--slate-500)" }}>{error}</p>
        ) : loading ? (
          <p className="muted" style={{ fontSize: "0.88rem" }}>Connecting to meteorological satellites…</p>
        ) : weather?.current ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span style={{ fontSize: "2.5rem", fontWeight: 800, fontFamily: "var(--font-heading)", color: "var(--text-main)", lineHeight: 1 }}>
                {weather.current.temperature_2m ?? "—"}°C
              </span>
              <span className="muted" style={{ fontWeight: 600 }}>Current Ambient</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <div style={{ padding: "8px 10px", background: "var(--slate-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Icons.Droplet size={12} />
                  <span>Humidity</span>
                </div>
                <strong style={{ fontSize: "1rem" }}>{weather.current.relative_humidity_2m ?? "—"}%</strong>
              </div>

              <div style={{ padding: "8px 10px", background: "var(--slate-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Icons.Wind size={12} />
                  <span>Wind</span>
                </div>
                <strong style={{ fontSize: "1rem" }}>{weather.current.wind_speed_10m ?? "—"} km/h</strong>
              </div>

              <div style={{ padding: "8px 10px", background: "var(--sky-light)", borderRadius: "var(--radius-sm)", border: "1px solid var(--sky-border)" }}>
                <div style={{ fontSize: "0.75rem", color: "var(--sky-blue)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Icons.CloudRain size={12} />
                  <span>Rain Max</span>
                </div>
                <strong style={{ fontSize: "1rem", color: "var(--sky-blue)" }}>
                  {weather.daily?.precipitation_probability_max?.[0] ?? "—"}%
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <p className="muted">No data returned.</p>
        )}
      </div>

      <div style={{ marginTop: 16, paddingTop: 10, borderTop: "1px solid var(--border-subtle)", fontSize: "0.75rem", color: "var(--text-muted)" }}>
        Real-time coordinates synced from farm GPS.
      </div>
    </article>
  );
}
