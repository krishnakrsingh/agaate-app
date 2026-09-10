"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { GeoMapPin } from "./map/geo-map";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => <div style={{ height: 300, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13 }}>Map loading…</div>,
});

interface TaskPin {
  taskId: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  officer: string | null;
  plotId: string;
  plotName: string;
  boundaryGeoJson: string | null;
  latitude: number;
  longitude: number;
}

function pinColor(status: string, dueDate: string): string {
  const today = new Date().toISOString().slice(0, 10);
  if (status === "BLOCKED") return "#a63b32";
  if (dueDate < today) return "#dc2626";
  if (status === "IN_PROGRESS") return "#315f86";
  return "#9a6818";
}

/**
 * Located work, on a map: open task pins colored by state, over the farm
 * fence. Unlocated tasks (no plot) are counted, never faked onto the map.
 */
export function TaskMapCard({ farmId }: { farmId: string }) {
  const [pins, setPins] = useState<TaskPin[]>([]);
  const [farm, setFarm] = useState<{ name: string; boundaryGeoJson: string | null; latitude: number; longitude: number } | null>(null);
  const [unlocated, setUnlocated] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/farms/${farmId}/task-pins`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!body) return;
        setPins(body.pins ?? []);
        setFarm(body.farm ?? null);
        setUnlocated(body.excluded?.unlocated ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [farmId]);

  const mapPins: GeoMapPin[] = pins.map((p) => ({
    key: p.taskId,
    lat: p.latitude,
    lng: p.longitude,
    color: pinColor(p.status, p.dueDate),
    label: `${p.title} · ${p.plotName} · ${p.status}`,
  }));

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <strong style={{ fontSize: 14 }}>Task Map{loading ? "…" : ` · ${pins.length} located`}</strong>
        <span style={{ fontSize: 11.5, color: "var(--muted)" }}>
          <span style={{ color: "#dc2626" }}>●</span> overdue/blocked{" "}
          <span style={{ color: "#315f86" }}>●</span> doing{" "}
          <span style={{ color: "#9a6818" }}>●</span> queued
          {unlocated > 0 && ` · ${unlocated} without plot not shown`}
        </span>
      </div>
      {!loading && pins.length === 0 && (
        <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>No open located tasks. Assign tasks to plots to see them here.</p>
      )}
      {!loading && pins.length > 0 && farm && (
        <div style={{ marginTop: 10 }}>
          <GeoMap
            center={[farm.latitude, farm.longitude]}
            polygon={null}
            onChange={() => undefined}
            interactive={false}
            pins={mapPins}
            height={300}
          />
        </div>
      )}
      {!loading && pins.slice(0, 6).map((p) => (
        <div className="list-row" key={p.taskId}>
          <span style={{ flex: 1 }}>
            <b>{p.title}</b> <small style={{ color: "var(--muted)" }}>· {p.plotName} · due {p.dueDate}{p.officer ? ` · ${p.officer}` : ""}</small>
          </span>
          <span className="badge">{p.status.replace("_", " ")}</span>
        </div>
      ))}
    </div>
  );
}
