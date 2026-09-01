"use client";
import { FormEvent, useEffect, useState } from "react";
import { Icons } from "./icons";

type Farm = { id: string; name: string };

export function LocationRequestForm() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: Farm[]) => {
        setFarms(list);
        if (list.length > 0) setFarmId(list[0].id);
      })
      .catch(() => setMessage("Unable to load farms."));
  }, []);

  function capture() {
    if (!navigator.geolocation) {
      setMessage("This device cannot provide location.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(String(p.coords.latitude));
        setLng(String(p.coords.longitude));
        setMessage("Current device GPS coordinates captured.");
      },
      (reason) =>
        setMessage(
          reason.code === 1
            ? "Location permission was denied."
            : reason.code === 3
            ? "Location timed out. Try again."
            : "Location is unavailable."
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");

    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    try {
      const r = await fetch("/api/location-change-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: f.get("farmId"),
          proposedLatitude: Number(f.get("proposedLatitude")),
          proposedLongitude: Number(f.get("proposedLongitude")),
          reason: f.get("reason"),
        }),
      });
      setPending(false);

      if (r.ok) {
        setMessage("Location change request submitted for Farm Admin review.");
        formEl?.reset();
      } else {
        const body = await r.json().catch(() => ({}));
        setMessage(body.error ?? "Request submission failed.");
      }
    } catch {
      setPending(false);
      setMessage("Network error.");
    }
  }

  return (
    <article className="card" style={{ marginTop: 24, padding: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1.05rem" }}>Need to Update Farm Coordinates?</h3>
          <p className="muted" style={{ fontSize: "0.82rem", margin: "2px 0 0" }}>
            Submit a farm boundary relocation request if the original geofence was misconfigured.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => setShow(!show)}
        >
          <Icons.Compass size={14} />
          <span>{show ? "Hide Request Form" : "Request Location Change"}</span>
        </button>
      </div>

      {show && (
        <form
          onSubmit={submit}
          style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "grid", gap: 14 }}
        >
          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Target Farm</label>
              <select
                name="farmId"
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                required
              >
                <option value="">Select farm…</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Reason for Relocation</label>
              <input
                name="reason"
                minLength={5}
                placeholder="e.g., Farm entrance gate relocated to North side"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label>Proposed Latitude</label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={capture}
                  style={{ fontSize: "0.75rem", padding: "0 4px", color: "var(--primary)" }}
                >
                  + Capture GPS
                </button>
              </div>
              <input
                name="proposedLatitude"
                type="number"
                step="any"
                min="-90"
                max="90"
                placeholder="e.g., 12.9716"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Proposed Longitude</label>
              <input
                name="proposedLongitude"
                type="number"
                step="any"
                min="-180"
                max="180"
                placeholder="e.g., 77.5946"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
              />
            </div>
          </div>

          {message && (
            <div
              className={message.includes("submitted") || message.includes("captured") ? "success-banner" : "error"}
              role="status"
            >
              <span>{message}</span>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn btn-primary" disabled={pending}>
              <Icons.Check size={15} />
              <span>{pending ? "Submitting…" : "Submit Location Request"}</span>
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
