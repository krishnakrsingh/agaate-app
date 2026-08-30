"use client";
import { useState, useRef } from "react";
import { Icons } from "./icons";

type LivenessResult = {
  verified: boolean;
  distance: number;
  similarityPercent: number;
  instruction: string;
};

export function LivenessChallenge({ onVerified }: { onVerified?: (r: LivenessResult) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [challenge, setChallenge] = useState<{ challengeId: string; instruction: string; challenge: string } | null>(null);
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<LivenessResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  async function ensureModels() {
    if (modelsLoaded || loadingModels) return;
    setLoadingModels(true);
    try {
      const faceapi: any = await import("@vladmandic/face-api");
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      setModelsLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Models failed to load.");
    } finally {
      setLoadingModels(false);
    }
  }

  async function startCamera() {
    await ensureModels();
    setError("");
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: 640 }, audio: false });
      setStream(ms);
      if (videoRef.current) {
        videoRef.current.srcObject = ms;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera unavailable.");
    }
  }

  async function fetchChallenge() {
    setLoadingChallenge(true);
    setError("");
    setStatus("Requesting randomized liveness challenge from server…");
    try {
      const res = await fetch("/api/liveness/challenge", { method: "POST" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Unable to get challenge. Ensure face enrollment exists.");
      setChallenge(body);
      setStatus(`Challenge: ${body.instruction} — perform action then verify. Challenge expires in ${body.ttlSeconds}s, single-use.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Challenge failed.");
      setStatus("");
    } finally {
      setLoadingChallenge(false);
    }
  }

  async function verifyLiveness() {
    if (!challenge) {
      setError("No challenge. Please fetch one first.");
      return;
    }
    if (!videoRef.current) return;
    setVerifying(true);
    setError("");
    setStatus("Detecting face and verifying…");
    try {
      const faceapi: any = await import("@vladmandic/face-api");
      const detection: any = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        setError("No face detected. Center face and try again.");
        setStatus("");
        setVerifying(false);
        return;
      }
      const all: any[] = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }));
      if (all.length > 1) {
        setError(`Multiple faces detected (${all.length}).`);
        setStatus("");
        setVerifying(false);
        return;
      }
      const descriptor: number[] = Array.from(detection.descriptor as Float32Array);
      setStatus("Sending embedding and challenge to server for verification…");
      const res = await fetch("/api/liveness/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId: challenge.challengeId, embedding: descriptor, modelId: "face-api-vladmandic", modelVersion: "0.2.0" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Liveness verification failed.");
      const r: LivenessResult = { verified: body.verified, distance: body.distance, similarityPercent: body.similarityPercent, instruction: body.instruction };
      setResult(r);
      setStatus(body.message ?? (r.verified ? "✓ Liveness verified" : "Failed"));
      if (r.verified && onVerified) onVerified(r);
      // Challenge is single-use; clear challenge after success to prevent replay confusion
      if (r.verified) setChallenge(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification error.");
      setStatus("");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 14, background: result?.verified ? "var(--primary-50)" : "var(--bg-card)", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Icons.Shield size={16} style={{ color: "var(--primary-600)" }} />
        <strong>Liveness — Randomized Challenge</strong>
        <span className="muted" style={{ fontSize: "0.7rem", background: "var(--slate-100)", padding: "2px 6px", borderRadius: 4 }}>basic freshness</span>
      </div>
      <p className="muted" style={{ fontSize: "0.72rem", margin: 0 }}>
        Server generates unpredictable instruction; you perform action; face embedding is compared server-side to enrollment (threshold 0.6). Proves capture freshness, not strong anti-spoof. Photo replay can still pass if attacker has your embedding — stronger PAD requires depth/texture model (not yet).
      </p>

      <div style={{ position: "relative", width: 280, height: 280, borderRadius: "var(--radius-lg)", overflow: "hidden", background: "#0f172a", margin: "0 auto", border: "2px solid var(--border-subtle)" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: cameraActive ? "block" : "none" }} />
        {!cameraActive && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--slate-400)", flexDirection: "column", gap: 8 }}>
            <Icons.Camera size={32} />
            <span style={{ fontSize: "0.85rem" }}>Front camera</span>
          </div>
        )}
        <div style={{ position: "absolute", width: 160, height: 200, left: "50%", top: "50%", transform: "translate(-50%,-50%)", borderRadius: "50%", border: "2px dashed rgba(255,255,255,0.35)", pointerEvents: "none" }} />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
        {!cameraActive ? (
          <button type="button" className="btn btn-primary" onClick={startCamera} style={{ minHeight: 44 }}>
            <Icons.Camera size={16} />
            <span>Launch Camera</span>
          </button>
        ) : !challenge ? (
          <button type="button" className="btn btn-primary" onClick={fetchChallenge} disabled={loadingChallenge || loadingModels} style={{ minHeight: 44 }}>
            <span>{loadingChallenge ? "Requesting challenge…" : "Get Liveness Challenge"}</span>
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={verifyLiveness} disabled={verifying} style={{ minHeight: 44, background: "#10b981", borderColor: "#059669" }}>
            <Icons.CheckCircle size={16} />
            <span>{verifying ? "Verifying…" : `Verify: ${challenge.instruction}`}</span>
          </button>
        )}
      </div>

      {challenge && !result?.verified && (
        <div className="hint" style={{ fontSize: "0.85rem", fontWeight: 600 }}>Instruction: {challenge.instruction} — perform action, then press Verify.</div>
      )}

      {loadingModels && <p className="muted" style={{ fontSize: "0.82rem", textAlign: "center" }}>Loading face model (6.7 MB)…</p>}
      {status && <div className="hint" style={{ fontSize: "0.82rem" }}><span>{status}</span></div>}
      {result && (
        <div className={result.verified ? "hint" : "error"} role="status" style={{ fontSize: "0.82rem" }}>
          <span>{result.verified ? `✓ Liveness verified — distance ${result.distance.toFixed(3)} ≤ 0.6 (${result.similarityPercent}%)` : `Failed — distance ${result.distance.toFixed(3)} > 0.6`}</span>
        </div>
      )}
      {error && <div className="error" role="alert"><Icons.AlertCircle size={14} /><span>{error}</span></div>}
    </div>
  );
}
