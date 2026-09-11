"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";

/**
 * Real polygon partition: clips the farm's drawn fence into a cols×rows
 * block grid on the SERVER (never hardcoded rectangles). Refuses to run
 * when the farm has no drawn boundary.
 */
export function GridSplitForm({
  farmId,
  hasBoundary,
}: {
  farmId: string;
  hasBoundary: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [cols, setCols] = useState("3");
  const [rows, setRows] = useState("2");
  const [prefix, setPrefix] = useState("Block");
  const [pending, setPending] = useState(false);
  const [armed, setArmed] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  async function split() {
    setPending(true);
    setError("");
    setResult("");
    setArmed(false);
    try {
      const res = await fetch(`/api/farms/${farmId}/plots/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cols: Number(cols), rows: Number(rows), namePrefix: prefix.trim() || "Block" }),
      });
      const body = await res.json().catch(() => ({}));
      setPending(false);
      if (!res.ok) {
        setError(body.error ?? "Unable to subdivide.");
        return;
      }
      setResult(
        `Created ${body.plots.length} blocks totaling ${body.totalAcres} ac (farm fence ${body.farmAcres} ac).`
      );
      router.refresh();
    } catch {
      setPending(false);
      setError("Network error.");
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={() => setOpen(true)}
        title={hasBoundary ? "Subdivide the drawn farm fence into plot blocks" : "Draw the farm boundary first"}
      >
        <Icons.Plot size={14} />
        <span>Divide into Blocks</span>
      </button>
    );
  }

  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-md)",
        padding: 16,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        maxWidth: 520,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: 14 }}>Subdivide Farm Fence</strong>
        <button type="button" className="text-action" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
      {!hasBoundary ? (
        <p className="muted" style={{ margin: 0, fontSize: 13 }}>
          Draw the farm boundary first (onboarding map or Farm Settings) — blocks are clipped from the real fence,
          never invented.
        </p>
      ) : (
        <>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            Clips the drawn fence into a grid. Each block is containment-checked on the server before saving.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <label style={{ fontSize: 12 }}>
              Columns
              <input type="number" min={1} max={10} value={cols} onChange={(e) => setCols(e.target.value)} style={{ width: 70, marginLeft: 6 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Rows
              <input type="number" min={1} max={10} value={rows} onChange={(e) => setRows(e.target.value)} style={{ width: 70, marginLeft: 6 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Name prefix
              <input value={prefix} onChange={(e) => setPrefix(e.target.value)} style={{ width: 110, marginLeft: 6 }} maxLength={40} />
            </label>
          </div>
          <div>
            {!armed ? (
              <button
                type="button"
                className="btn btn-green btn-sm"
                disabled={pending}
                onClick={() => {
                  setError("");
                  setResult("");
                  setArmed(true);
                }}
              >
                Review {Number(cols) || 0}×{Number(rows) || 0} blocks
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 13 }}>
                  Create {(Number(cols) || 0) * (Number(rows) || 0)} plots from the fence? This writes records.
                </span>
                <button type="button" className="btn btn-green btn-sm" disabled={pending} onClick={split}>
                  {pending ? "Subdividing…" : "Confirm — create blocks"}
                </button>
                <button type="button" className="btn btn-sm" disabled={pending} onClick={() => setArmed(false)}>
                  Back
                </button>
              </div>
            )}
          </div>
        </>
      )}
      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      {result && (
        <div className="success-banner" role="status">
          <Icons.CheckCircle size={16} />
          <span>{result}</span>
        </div>
      )}
    </div>
  );
}
