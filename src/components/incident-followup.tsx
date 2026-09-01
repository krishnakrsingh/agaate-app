"use client";
import { FormEvent, useEffect, useState } from "react";
import { Icons } from "./icons";

type FollowUp = {
  id: string;
  action: string;
  remarks: string | null;
  createdAt: string;
  author: { name: string; role: string };
};

export function IncidentFollowUp({ incidentId }: { incidentId: string }) {
  const [items, setItems] = useState<FollowUp[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const load = () =>
    fetch(`/api/incidents/${incidentId}/follow-ups`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((v) => setItems(v.followUps ?? []))
      .catch(() => setMessage("Unable to load follow-ups."));

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incidentId]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    const formEl = e.currentTarget;
    const f = new FormData(formEl);

    try {
      const res = await fetch(`/api/incidents/${incidentId}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: f.get("action"),
          remarks: f.get("remarks") || null,
        }),
      });
      setPending(false);
      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        setMessage(body.error ?? "Unable to add follow-up.");
        return;
      }

      formEl?.reset();
      setMessage("Follow-up action recorded.");
      setShowForm(false);
      void load();
    } catch {
      setPending(false);
      setMessage("Network error.");
    }
  }

  return (
    <div
      style={{
        marginTop: 12,
        padding: 14,
        background: "var(--card-muted)",
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <strong style={{ fontSize: "0.85rem", color: "var(--text-main)", display: "flex", alignItems: "center", gap: 6 }}>
          <Icons.Activity size={14} style={{ color: "var(--primary)" }} />
          <span>Follow-up Actions ({items.length})</span>
        </strong>

        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => setShowForm(!showForm)}
          style={{ padding: "4px 8px", fontSize: "0.75rem" }}
        >
          {showForm ? "Cancel" : "+ Add Follow-up"}
        </button>
      </div>

      {items.length ? (
        <div style={{ display: "grid", gap: 6, margin: "8px 0" }}>
          {items.map((f) => (
            <div
              key={f.id}
              style={{
                padding: "8px 10px",
                background: "var(--card)",
                borderRadius: "var(--radius-xs)",
                border: "1px solid var(--border)",
                fontSize: "0.85rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <strong style={{ color: "var(--primary)" }}>{f.action}</strong>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                  {new Date(f.createdAt).toLocaleDateString()}
                </span>
              </div>
              {f.remarks && (
                <p style={{ margin: "2px 0 4px", fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  {f.remarks}
                </p>
              )}
              <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                By {f.author.name} ({f.author.role.replaceAll("_", " ")})
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0" }}>
          No follow-ups recorded yet.
        </p>
      )}

      {showForm && (
        <form onSubmit={submit} style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)", display: "grid", gap: 10 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.8rem" }}>Action taken / scheduled</label>
            <input
              name="action"
              required
              minLength={3}
              maxLength={120}
              placeholder="e.g., Spray scheduled, Field inspection, Irrigation pipe repaired"
              style={{ padding: "6px 10px", fontSize: "0.85rem" }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label style={{ fontSize: "0.8rem" }}>Remarks</label>
            <textarea
              name="remarks"
              maxLength={2000}
              placeholder="Provide technical instructions or Agronomist guidance"
              rows={2}
              style={{ padding: "6px 10px", fontSize: "0.85rem" }}
            />
          </div>

          {message && (
            <div className={message.includes("recorded") ? "success-banner" : "error"} style={{ padding: "6px 10px", fontSize: "0.8rem", margin: "4px 0" }}>
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            className="btn btn-sm btn-primary"
            disabled={pending}
            style={{ width: "fit-content" }}
          >
            {pending ? "Saving…" : "Save Follow-up"}
          </button>
        </form>
      )}
    </div>
  );
}
