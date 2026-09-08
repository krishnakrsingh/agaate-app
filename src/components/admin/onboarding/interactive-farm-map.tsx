"use client";
import { useState, useRef, useEffect, MouseEvent } from "react";
import { Icons } from "@/components/icons";

export interface BoundaryPoint {
  lat: number;
  lng: number;
  label?: string;
}

interface InteractiveFarmMapProps {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  boundaryPoints?: BoundaryPoint[];
  onCoordinatesChange: (lat: number, lng: number) => void;
  onRadiusChange?: (radius: number) => void;
  onBoundaryChange?: (points: BoundaryPoint[]) => void;
}

const REGION_PRESETS = [
  { name: "Bengaluru North", lat: 13.1986, lng: 77.7066 },
  { name: "Kolar Belt", lat: 13.1367, lng: 78.1291 },
  { name: "Chikkaballapur", lat: 13.4325, lng: 77.7275 },
  { name: "Nashik Vineyards", lat: 19.9975, lng: 73.7898 },
  { name: "Anantapur", lat: 14.6819, lng: 77.6006 },
];

export function InteractiveFarmMap({
  latitude,
  longitude,
  radiusMeters,
  boundaryPoints = [],
  onCoordinatesChange,
  onRadiusChange,
  onBoundaryChange,
}: InteractiveFarmMapProps) {
  const [zoom, setZoom] = useState(15);
  const [mode, setMode] = useState<"PIN" | "POLYGON">("PIN");
  const [points, setPoints] = useState<BoundaryPoint[]>(boundaryPoints);
  const [isLocating, setIsLocating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (boundaryPoints.length > 0) {
      setPoints(boundaryPoints);
    } else {
      const dLat = 0.0018;
      const dLng = 0.0022;
      const autoCorners: BoundaryPoint[] = [
        { lat: latitude + dLat, lng: longitude - dLng, label: "NW" },
        { lat: latitude + dLat, lng: longitude + dLng, label: "NE" },
        { lat: latitude - dLat, lng: longitude + dLng, label: "SE" },
        { lat: latitude - dLat, lng: longitude - dLng, label: "SW" },
      ];
      setPoints(autoCorners);
      onBoundaryChange?.(autoCorners);
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;

    const grad = ctx.createRadialGradient(centerX, centerY, 40, centerX, centerY, width / 1.2);
    grad.addColorStop(0, "#0d1f18");
    grad.addColorStop(0.5, "#081410");
    grad.addColorStop(1, "#040a08");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = "rgba(52, 211, 153, 0.08)";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const pxPerDegreeLat = (height / 0.008) * (zoom / 15);
    const pxPerDegreeLng = (width / 0.008) * (zoom / 15);

    const metersToPx = (radiusMeters / 100) * 16 * (zoom / 15);
    ctx.beginPath();
    ctx.arc(centerX, centerY, metersToPx, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(16, 185, 129, 0.06)";
    ctx.fill();
    ctx.strokeStyle = "rgba(16, 185, 129, 0.35)";
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    if (points.length > 2) {
      ctx.beginPath();
      points.forEach((pt, i) => {
        const px = centerX + (pt.lng - longitude) * pxPerDegreeLng;
        const py = centerY - (pt.lat - latitude) * pxPerDegreeLat;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.fillStyle = "rgba(59, 130, 246, 0.12)";
      ctx.fill();
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      points.forEach((pt, i) => {
        const px = centerX + (pt.lng - longitude) * pxPerDegreeLng;
        const py = centerY - (pt.lat - latitude) * pxPerDegreeLat;
        ctx.beginPath();
        ctx.arc(px, py, 5, 0, Math.PI * 2);
        ctx.fillStyle = "#60a5fa";
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
        ctx.font = "10px monospace";
        ctx.fillText("P" + (i + 1), px + 8, py - 6);
      });
    }

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 8, 12, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 18, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.fillStyle = "#ef4444";
    ctx.fill();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = "rgba(52, 211, 153, 0.7)";
    ctx.font = "11px monospace";
    ctx.fillText("LAT: " + latitude.toFixed(6), 14, 24);
    ctx.fillText("LNG: " + longitude.toFixed(6), 14, 40);
    ctx.fillText("GEOFENCE: " + radiusMeters + "m | ZOOM: " + zoom + "x", 14, 56);
  }, [latitude, longitude, radiusMeters, points, zoom]);

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const pxPerDegreeLat = (canvas.height / 0.008) * (zoom / 15);
    const pxPerDegreeLng = (canvas.width / 0.008) * (zoom / 15);

    const deltaLng = (clickX - centerX) / pxPerDegreeLng;
    const deltaLat = -(clickY - centerY) / pxPerDegreeLat;

    const newLat = Number((latitude + deltaLat).toFixed(6));
    const newLng = Number((longitude + deltaLng).toFixed(6));

    if (mode === "PIN") {
      onCoordinatesChange(newLat, newLng);
    } else {
      const updated = [...points, { lat: newLat, lng: newLng, label: "Corner " + (points.length + 1) }];
      setPoints(updated);
      onBoundaryChange?.(updated);
    }
  };

  const captureGps = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        onCoordinatesChange(Number(pos.coords.latitude.toFixed(6)), Number(pos.coords.longitude.toFixed(6)));
      },
      () => setIsLocating(false),
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const resetBoundaryToBox = () => {
    const dLat = 0.0018;
    const dLng = 0.0022;
    const corners: BoundaryPoint[] = [
      { lat: Number((latitude + dLat).toFixed(6)), lng: Number((longitude - dLng).toFixed(6)), label: "NW" },
      { lat: Number((latitude + dLat).toFixed(6)), lng: Number((longitude + dLng).toFixed(6)), label: "NE" },
      { lat: Number((latitude - dLat).toFixed(6)), lng: Number((longitude + dLng).toFixed(6)), label: "SE" },
      { lat: Number((latitude - dLat).toFixed(6)), lng: Number((longitude - dLng).toFixed(6)), label: "SW" },
    ];
    setPoints(corners);
    onBoundaryChange?.(corners);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={() => setMode("PIN")}
            className={"btn btn-sm " + (mode === "PIN" ? "btn-green" : "btn-secondary")}
            style={{ fontSize: "12px", gap: 6 }}
          >
            <Icons.MapPin size={14} />
            <span>Farm HQ Pin</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("POLYGON")}
            className={"btn btn-sm " + (mode === "POLYGON" ? "btn-green" : "btn-secondary")}
            style={{ fontSize: "12px", gap: 6 }}
          >
            <Icons.Maximize2 size={14} />
            <span>Draw Parcel Polygon ({points.length} pts)</span>
          </button>
          {mode === "POLYGON" && (
            <button
              type="button"
              onClick={resetBoundaryToBox}
              className="btn btn-sm btn-outline"
              style={{ fontSize: "11px" }}
            >
              Reset 4-Corner Box
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(18, z + 1))}
            className="btn btn-sm btn-secondary"
            title="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(12, z - 1))}
            className="btn btn-sm btn-secondary"
            title="Zoom out"
          >
            -
          </button>
          <button
            type="button"
            onClick={captureGps}
            disabled={isLocating}
            className="btn btn-sm btn-outline"
            style={{ fontSize: "12px", gap: 6 }}
          >
            <Icons.Navigation size={13} />
            <span>{isLocating ? "Locating…" : "My GPS"}</span>
          </button>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          width: "100%",
          height: "340px",
          borderRadius: "var(--radius-md)",
          overflow: "hidden",
          border: "1px solid rgba(52, 211, 153, 0.3)",
          boxShadow: "inset 0 0 24px rgba(0, 0, 0, 0.8)",
          background: "#040a08",
          cursor: mode === "PIN" ? "crosshair" : "cell",
        }}
      >
        <canvas
          ref={canvasRef}
          width={560}
          height={340}
          onClick={handleCanvasClick}
          style={{ width: "100%", height: "100%", display: "block" }}
        />

        <div
          style={{
            position: "absolute",
            bottom: 10,
            left: 10,
            right: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "6px 12px",
            background: "rgba(4, 10, 8, 0.85)",
            backdropFilter: "blur(8px)",
            borderRadius: "var(--radius-sm)",
            border: "1px solid rgba(52, 211, 153, 0.2)",
            fontSize: "11px",
            color: "#a7f3d0",
            fontFamily: "monospace",
          }}
        >
          <div>
            <span style={{ color: "#34d399", fontWeight: 600 }}>HQ: </span>
            {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
          </div>
          <div>
            <span style={{ color: "#60a5fa", fontWeight: 600 }}>BOUNDARY: </span>
            {points.length} vertices
          </div>
          <div style={{ color: "var(--muted-fg)" }}>
            Click to {mode === "PIN" ? "reposition HQ pin" : "add boundary point"}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        <span style={{ fontSize: "11px", color: "var(--muted-fg)", whiteSpace: "nowrap" }}>Quick Hubs:</span>
        {REGION_PRESETS.map((hub) => (
          <button
            key={hub.name}
            type="button"
            onClick={() => onCoordinatesChange(hub.lat, hub.lng)}
            className="btn btn-sm btn-outline"
            style={{ fontSize: "11px", padding: "2px 8px", whiteSpace: "nowrap" }}
          >
            {hub.name}
          </button>
        ))}
      </div>
    </div>
  );
}
