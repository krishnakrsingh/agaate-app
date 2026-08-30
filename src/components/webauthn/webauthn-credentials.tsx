"use client";
import { useEffect, useState, useCallback } from "react";
import { Icons } from "../icons";

type Credential = {
  id: string;
  credentialId: string;
  name: string | null;
  transports: string | null;
  deviceType: string | null;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  counter: string;
};

export function WebAuthnCredentials({ refreshKey }: { refreshKey?: number }) {
  const [creds, setCreds] = useState<Credential[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/webauthn/credentials");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to load credentials.");
      }
      setCreds(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function revoke(credentialId: string) {
    if (!confirm("Revoke this device? You will need to re-register to use it for attendance.")) return;
    setMessage("");
    setError("");
    try {
      const res = await fetch("/api/webauthn/credentials", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credentialId }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Revoke failed.");
      setMessage("Device revoked. Enrollment removed.");
      void load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Revoke failed.");
    }
  }

  if (loading) return <p className="muted" style={{ fontSize: "0.85rem" }}>Loading registered devices…</p>;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div className="hint" role="status">
          <Icons.CheckCircle size={14} />
          <span>{message}</span>
        </div>
      )}

      {creds.length === 0 ? (
        <div className="empty" style={{ padding: 14 }}>
          <Icons.Shield size={20} style={{ color: "var(--slate-400)", margin: "0 auto" }} />
          <p style={{ margin: "8px 0 0", fontSize: "0.85rem" }}>No devices registered yet.</p>
          <p className="muted" style={{ fontSize: "0.78rem" }}>Register a device with Face ID / Touch ID to enable attendance verification.</p>
        </div>
      ) : (
        creds.map((c) => (
          <div
            key={c.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 14px",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              background: "white",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong style={{ fontSize: "0.9rem" }}>{c.name || "Unnamed device"}</strong>
                <span style={{ fontSize: "0.7rem", padding: "2px 6px", borderRadius: 4, background: "var(--slate-100)" }}>
                  {c.deviceType ?? "unknown"} {c.backedUp ? "• backed up" : "• single device"}
                </span>
              </div>
              <div className="muted" style={{ fontSize: "0.75rem", marginTop: 2 }}>
                Created {new Date(c.createdAt).toLocaleDateString()} • Last used{" "}
                {c.lastUsedAt ? new Date(c.lastUsedAt).toLocaleString() : "never"} • Counter {c.counter}
              </div>
              <div className="muted" style={{ fontSize: "0.72rem" }}>
                ID: {c.credentialId.slice(0, 24)}…
              </div>
            </div>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => revoke(c.credentialId)} style={{ color: "var(--danger-red)" }}>
              <Icons.Trash size={12} />
              <span>Revoke</span>
            </button>
          </div>
        ))
      )}
    </div>
  );
}
