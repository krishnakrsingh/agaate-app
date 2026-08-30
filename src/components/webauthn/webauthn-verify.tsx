"use client";
import { useState } from "react";
import { startAuthentication } from "@simplewebauthn/browser";
import { Icons } from "../icons";

export function WebAuthnVerify({
  onVerified,
  label = "Verify Identity for Attendance",
  userId,
}: {
  onVerified?: (result: { verified: boolean; credentialId: string }) => void;
  label?: string;
  userId?: string;
}) {
  const [status, setStatus] = useState<"idle" | "preparing" | "contacting" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleVerify() {
    setStatus("preparing");
    setMessage("");
    try {
      const optionsRes = await fetch("/api/webauthn/auth/options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userId ? { userId } : {}),
      });
      if (!optionsRes.ok) {
        const body = await optionsRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to prepare device verification.");
      }
      const options = await optionsRes.json();
      setStatus("contacting");
      setMessage("Waiting for device biometric — use Face ID, Touch ID, or Windows Hello.");

      let authResp;
      try {
        authResp = await startAuthentication(options);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NotAllowedError")) throw new Error("Device verification was cancelled or timed out.");
        throw new Error(msg || "Device interaction failed.");
      }

      setStatus("verifying");
      setMessage("Verifying device response with server…");

      const verifyRes = await fetch("/api/webauthn/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: authResp, userId }),
      });
      const body = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) throw new Error(body.error ?? "Device verification failed.");

      setStatus("success");
      setMessage("✓ Device verification complete — authenticator successfully verified.");
      if (onVerified) onVerified({ verified: true, credentialId: body.credentialId });
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Verification failed.");
    }
  }

  const isBusy = status === "preparing" || status === "contacting" || status === "verifying";

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: 14,
        background: status === "success" ? "var(--primary-50)" : "var(--bg-card)",
      }}
    >
      <button
        type="button"
        className="btn btn-primary"
        onClick={handleVerify}
        disabled={isBusy}
        style={{ minHeight: 44, width: "100%" }}
      >
        {isBusy ? (
          <span>{status === "preparing" ? "Preparing verification…" : status === "contacting" ? "Waiting for device…" : "Verifying with server…"}</span>
        ) : (
          <>
            <Icons.Shield size={16} />
            <span>{label}</span>
          </>
        )}
      </button>

      {message && (
        <div
          className={status === "success" ? "hint" : status === "error" ? "error" : "hint"}
          role={status === "error" ? "alert" : "status"}
          style={{ marginTop: 10, fontSize: "0.82rem" }}
        >
          <span>{message}</span>
        </div>
      )}

      <p className="muted" style={{ fontSize: "0.72rem", marginTop: 8 }}>
        WebAuthn proves the enrolled device authenticator verified its user. It does not perform Agaate facial recognition (Stage 2
        face match is separate).
      </p>
    </div>
  );
}
