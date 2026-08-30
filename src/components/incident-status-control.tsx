"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function IncidentStatusControl({
  incidentId,
  status,
}: {
  incidentId: string;
  status: string;
}) {
  const router = useRouter();
  const [next, setNext] = useState(status);
  const [pending, setPending] = useState(false);

  async function update(value: string) {
    setNext(value);
    setPending(true);
    try {
      const r = await fetch(`/api/incidents/${incidentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      setPending(false);
      if (r.ok) router.refresh();
    } catch {
      setPending(false);
    }
  }

  return (
    <select
      value={next}
      onChange={(e) => update(e.target.value)}
      disabled={pending}
      style={{
        padding: "4px 8px",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border-strong)",
        fontSize: "0.75rem",
        fontWeight: 700,
        background: "white",
        textTransform: "uppercase",
      }}
    >
      <option value="OPEN">Open</option>
      <option value="ACKNOWLEDGED">Acknowledged</option>
      <option value="RESOLVED">Resolved</option>
      <option value="CLOSED">Closed</option>
    </select>
  );
}
