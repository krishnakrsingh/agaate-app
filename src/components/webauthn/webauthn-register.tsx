"use client";
import { useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Icons } from "../icons";

export function WebAuthnRegister({ onRegistered }: { onRegistered?: () => void }) {
  const [status, setStatus] = useState<"idle" | "preparing" | "contacting" | "verifying" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [deviceName, setDeviceName] = useState("");

  async function handleRegister() {
    setStatus("preparing");
    setMessage("");
    try {
      const optionsRes = await fetch("/api/webauthn/register/options", { method: "POST" });
      if (!optionsRes.ok) {
        const body = await optionsRes.json().catch(() => ({}));
        throw new Error(body.error ?? "Unable to prepare device registration. Ensure you are logged in and your account is active.");
      }
      const options = await optionsRes.json();
      setStatus("contacting");
      setMessage("Waiting for device biometric verification — please use Face ID, Touch ID, or Windows Hello when prompted.");

      let attResp;
      try {
        attResp = await startRegistration(options);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("NotAllowedError") || msg.includes("was not allowed")) {
          throw new Error("Device verification was cancelled or timed out. Please try again.");
        }
        if (msg.includes("NotSupportedError")) {
          throw new Error("This device or browser does not support platform authenticators. Try a different device.");
        }
        throw new Error(msg || "Device interaction failed.");
      }

      setStatus("verifying");
      setMessage("Verifying device response with server…");

      const verifyRes = await fetch("/api/webauthn/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential: attResp, deviceName: deviceName || null }),
      });
      const verifyBody = await verifyRes.json().catch(() => ({}));
      if (!verifyRes.ok) throw new Error(verifyBody.error ?? "Device verification failed on server.");

      setStatus("success");
      setMessage("Device successfully registered. This device can now verify your identity for attendance.");
      setDeviceName("");
      if (onRegistered) onRegistered();
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Registration failed.");
    }
  }

  const isBusy = status === "preparing" || status === "contacting" || status === "verifying";

  return (
    <div
      style={{
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--radius-lg)",
        padding: 16,
        background: "var(--bg-card)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Icons.Shield size={18} style={{ color: "var(--primary-600)" }} />
        <strong style={{ fontSize: "0.95rem" }}>Register Device for Identity Verification</strong>
      </div>
      <p className="muted" style={{ fontSize: "0.82rem", margin: "0 0 12px" }}>
        Uses WebAuthn platform authenticator (Face ID, Touch ID, Windows Hello, Android biometric). The biometric never leaves your
        device; the server receives only a cryptographic credential.
      </p>

      <div className="form-group" style={{ marginBottom: 12 }}>
        <label style={{ fontSize: "0.8rem" }}>Device name (optional)</label>
        <input
          value={deviceName}
          onChange={(e) => setDeviceName(e.target.value)}
          placeholder="e.g., Suresh iPhone 14"
          maxLength={80}
          style={{ fontSize: "0.85rem" }}
          disabled={isBusy}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary"
        onClick={handleRegister}
        disabled={isBusy}
        style={{ minHeight: 44, width: "100%" }}
      >
        {isBusy ? (
          <span>Verifying device…</span>
        ) : (
          <>
            <Icons.Fingerprint size={16} />
            <span>Verify with Face ID / Fingerprint</span>
          </>
        )}
      </button>

      {status !== "idle" && message && (
        <div
          className={status === "success" ? "hint" : status === "error" ? "error" : "hint"}
          role="status"
          style={{ marginTop: 12, fontSize: "0.82rem" }}
        >
          <span>{message}</span>
        </div>
      )}

      {status === "contacting" && (
        <p className="muted" style={{ fontSize: "0.75rem", marginTop: 8 }}>
          Your device is performing user verification. This proves possession of the enrolled authenticator — it does not enroll your
          face for Agaate facial recognition (separate Stage 2).
        </p>
      )}
    </div>
  );
}
