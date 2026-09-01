"use client";
import { useCallback, useEffect, useState } from "react";
import { Icons } from "./icons";

type Person = {
  id: string;
  name: string;
  email: string;
  role: string;
  active?: boolean;
};

type AccessResponse = {
  access: Array<{ id: string; user: Person; canManage: boolean }>;
  users: Person[];
};

export function FarmAccessManager({ farmId }: { farmId: string }) {
  const [data, setData] = useState<AccessResponse | null>(null);
  const [userId, setUserId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  const load = useCallback(
    () =>
      fetch(`/api/farms/${farmId}/access`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then(setData)
        .catch(() => setMessage("Unable to load Farm Officer accounts.")),
    [farmId]
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function assign() {
    if (!userId) return;
    setPending(true);
    setMessage("");

    try {
      const r = await fetch(`/api/farms/${farmId}/access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, canManage: false }),
      });
      setPending(false);

      if (r.ok) {
        setMessage("Officer successfully assigned to this farm.");
        setUserId("");
        void load();
      } else {
        const body = await r.json().catch(() => ({}));
        setMessage(body.error ?? "Assignment failed.");
      }
    } catch {
      setPending(false);
      setMessage("Network error.");
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Unassign this officer from the farm?")) return;
    setMessage("");

    try {
      const r = await fetch(`/api/farms/${farmId}/access`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: id }),
      });

      if (r.ok) {
        setMessage("Officer unassigned.");
        void load();
      } else {
        const body = await r.json().catch(() => ({}));
        setMessage(body.error ?? "Unassignment failed.");
      }
    } catch {
      setMessage("Network error.");
    }
  }

  const assignedOfficers = data?.access.filter((a) => a.user.role === "FARM_OFFICER") ?? [];
  const availableOfficers =
    data?.users.filter((u) => !data.access.some((a) => a.user.id === u.id)) ?? [];

  return (
    <article className="card" style={{ padding: 22 }}>
      <div className="card-header">
        <div>
          <h3 style={{ margin: 0 }}>Assigned Farm Officers</h3>
          <p className="muted" style={{ fontSize: "0.85rem", margin: "2px 0 0" }}>
            Assign Farm Officers to execute daily tasks, mark geofenced attendance, and record monitoring telemetry.
          </p>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          style={{
            padding: "9px 14px",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.88rem",
            flex: "1 1 280px",
          }}
        >
          <option value="">Select an active Farm Officer to assign…</option>
          {availableOfficers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.email})
            </option>
          ))}
        </select>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={assign}
          disabled={!userId || pending}
        >
          <Icons.Plus size={15} />
          <span>{pending ? "Assigning…" : "Assign Officer"}</span>
        </button>
      </div>

      {message && (
        <div className={message.includes("failed") || message.includes("Unable") ? "error" : "success-banner"} role="alert">
          {message.includes("failed") || message.includes("Unable") ? (
            <Icons.AlertCircle size={16} />
          ) : (
            <Icons.CheckCircle size={16} />
          )}
          <span>{message}</span>
        </div>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {assignedOfficers.map((a) => (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "10px 14px",
              background: "var(--card-muted)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div className="user-avatar" style={{ width: 32, height: 32 }}>
                {a.user.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <strong style={{ fontSize: "0.9rem" }}>{a.user.name}</strong>
                <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                  {a.user.email} &bull; Farm Officer
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => remove(a.user.id)}
            >
              <Icons.Trash size={13} />
              <span>Remove</span>
            </button>
          </div>
        ))}

        {!assignedOfficers.length && (
          <p className="muted" style={{ fontSize: "0.85rem", margin: 0 }}>
            No farm officers assigned to this farm yet.
          </p>
        )}
      </div>
    </article>
  );
}
