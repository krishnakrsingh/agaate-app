"use client";
/* eslint-disable react-hooks/set-state-in-effect */
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
    <article className="compact-card" style={{ margin: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 20 }}>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "var(--radius-xs)", background: "var(--stone)", color: "var(--green)", display: "grid", placeItems: "center" }}>
              <Icons.Sun size={15} />
            </div>
            <h3 className="item-title" style={{ margin: 0 }}>Live Weather Telemetry</h3>
          </div>
          <span className="mono-label" style={{ background: "var(--stone)", color: "var(--muted)", padding: "2px 6px", borderRadius: "var(--radius-xs)" }}>
            Open-Meteo Live
          </span>
        </div>

        {error ? (
          <p className="muted" style={{ fontSize: "13px" }}>{error}</p>
        ) : loading ? (
          <p className="muted" style={{ fontSize: "13px" }}>Connecting to meteorological satellites…</p>
        ) : weather?.current ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
              <span className="data" style={{ fontSize: "32px", fontWeight: 600, color: "var(--ink)", lineHeight: 1 }}>
                {weather.current.temperature_2m ?? "—"}°C
              </span>
              <span className="mono-label">Ambient Air</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 80px), 1fr))", gap: 8 }}>
              <div style={{ padding: "8px 10px", background: "var(--stone)", borderRadius: "var(--radius-xs)", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Icons.Droplet size={11} />
                  <span>Humidity</span>
                </div>
                <strong className="data" style={{ fontSize: "14px", color: "var(--ink)" }}>{weather.current.relative_humidity_2m ?? "—"}%</strong>
              </div>

              <div style={{ padding: "8px 10px", background: "var(--stone)", borderRadius: "var(--radius-xs)", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--muted)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Icons.Wind size={11} />
                  <span>Wind</span>
                </div>
                <strong className="data" style={{ fontSize: "14px", color: "var(--ink)" }}>{weather.current.wind_speed_10m ?? "—"} km/h</strong>
              </div>

              <div style={{ padding: "8px 10px", background: "var(--stone)", borderRadius: "var(--radius-xs)", border: "1px solid var(--line)" }}>
                <div style={{ fontSize: "11px", color: "var(--blue)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Icons.CloudRain size={11} />
                  <span>Rain Max</span>
                </div>
                <strong className="data" style={{ fontSize: "14px", color: "var(--blue)" }}>
                  {weather.daily?.precipitation_probability_max?.[0] ?? "—"}%
                </strong>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--line)", fontSize: "11px", color: "var(--muted)" }}>
        Updates automatically via farm GPS coordinates
      </div>
    </article>
  );
}
