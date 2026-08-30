"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";

export function FarmStatusControl({
  farmId,
  status,
}: {
  farmId: string;
  status: string;
}) {
  const router = useRouter();
  const [next, setNext] = useState(status);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function save() {
    setPending(true);
    setError("");

    try {
      const r = await fetch(`/api/farms/${farmId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      setPending(false);

      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setError(body.error ?? "Status update failed.");
        return;
      }

      router.refresh();
    } catch {
      setPending(false);
      setError("Network error.");
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <select
        value={next}
        onChange={(e) => setNext(e.target.value)}
        style={{
          padding: "8px 12px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border-strong)",
          fontSize: "0.85rem",
          fontWeight: 600,
          background: "white",
        }}
      >
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="COMPLETED">Completed</option>
      </select>

      <button
        type="button"
        className="btn btn-sm btn-secondary"
        onClick={save}
        disabled={next === status || pending}
      >
        <span>{pending ? "Saving…" : "Update Status"}</span>
      </button>

      {error && (
        <span style={{ color: "var(--danger-red)", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: 4 }}>
          <Icons.AlertCircle size={14} />
          {error}
        </span>
      )}
    </div>
  );
}
