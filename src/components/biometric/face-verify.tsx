"use client";
import { useEffect, useRef, useState } from "react";
import { Icons } from "../icons";

type VerifyResult = {
  matched: boolean;
  distance: number;
  similarityPercent: number;
  threshold: number;
  thresholdVersion: string;
  modelId: string;
  modelVersion: string;
};

export function FaceVerify({ onResult }: { onResult?: (r: VerifyResult) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingModels(true);
      try {
        const faceapi: any = await import("@vladmandic/face-api");
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
        if (!cancelled) setModelsLoaded(true);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Models failed to load.");
      } finally {
        if (!cancelled) setLoadingModels(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startCamera() {
    setError("");
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: 640 }, audio: false });
      setStream(ms);
      if (videoRef.current) {
        videoRef.current.srcObject = ms;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setStatus("Camera active. Position face clearly for verification.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera unavailable.");
    }
  }

  async function verifyOnce() {
    if (!modelsLoaded) {
      setError("Model not loaded.");
      return;
    }
    if (!videoRef.current) return;
    setVerifying(true);
    setError("");
    setStatus("Detecting face…");
    try {
      const faceapi: any = await import("@vladmandic/face-api");
      const video = videoRef.current;
      const detection: any = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 })).withFaceLandmarks().withFaceDescriptor();
      if (!detection) {
        setError("No face detected. Retry in better lighting, center face.");
        setStatus("");
        setVerifying(false);
        return;
      }
      const all: any[] = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }));
      if (all.length > 1) {
        setError(`Multiple faces detected (${all.length}). Ensure only you are present.`);
        setStatus("");
        setVerifying(false);
        return;
      }
      const descriptor: number[] = Array.from(detection.descriptor as Float32Array);
      setStatus("Checking face… → verifying with server…");
      const res = await fetch("/api/biometric/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ embedding: descriptor, modelId: "face-api-vladmandic", modelVersion: "0.2.0" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Map specific cases to honest UI
        if (res.status === 404) throw new Error("No active enrollment. Please enroll first.");
        if (res.status === 422 && body.error?.includes("mismatch")) throw new Error("Model version mismatch — please re-enroll.");
        throw new Error(body.error ?? "Verification failed.");
      }
      const r: VerifyResult = body;
      setResult(r);
      setStatus(r.matched ? `✓ Face verified — distance ${r.distance.toFixed(3)} (similarity ${r.similarityPercent}%) ≤ threshold ${r.threshold}` : `Face verification failed — distance ${r.distance.toFixed(3)} (similarity ${r.similarityPercent}%) > threshold ${r.threshold}. Retry in better lighting.`);
      if (onResult) onResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification error.");
      setStatus("");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 16, background: "var(--bg-card)", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Icons.Shield size={16} style={{ color: "var(--primary-600)" }} />
        <strong>Face Verification — Live Check</strong>
      </div>

      <div style={{ position: "relative", width: 300, height: 300, borderRadius: "var(--radius-lg)", overflow: "hidden", background: "#0f172a", margin: "0 auto", border: "2px solid var(--border-subtle)" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: cameraActive ? "block" : "none" }} />
        {!cameraActive && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--slate-400)", flexDirection: "column", gap: 8 }}>
            <Icons.Camera size={36} />
            <span style={{ fontSize: "0.85rem" }}>Front camera</span>
          </div>
        )}
        <div style={{ position: "absolute", width: 170, height: 220, left: "50%", top: "50%", transform: "translate(-50%,-50%)", borderRadius: "50%", border: "2px dashed rgba(255,255,255,0.35)", pointerEvents: "none" }} />
      </div>

      <div style={{ display: "flex", gap: 8, justifyContent: "center" }}>
        {!cameraActive ? (
          <button type="button" className="btn btn-primary" onClick={startCamera} style={{ minHeight: 44 }}>
            <Icons.Camera size={16} />
            <span>Launch Camera</span>
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={verifyOnce} disabled={verifying || !modelsLoaded} style={{ minHeight: 44 }}>
            <Icons.CheckCircle size={16} />
            <span>{verifying ? "Checking face…" : "Verify Face"}</span>
          </button>
        )}
      </div>

      {loadingModels && <p className="muted" style={{ fontSize: "0.82rem", textAlign: "center" }}>Loading face recognition model (6.7 MB)…</p>}
      {result && (
        <div className={result.matched ? "hint" : "error"} role="status" style={{ fontSize: "0.85rem" }}>
          <span>
            {result.matched ? "✓ Face verified" : "Face verification failed"} — distance {result.distance.toFixed(3)} vs threshold {result.threshold} (similarity {result.similarityPercent}%, model {result.modelId}@{result.modelVersion}, thresholdVersion {result.thresholdVersion})
          </span>
        </div>
      )}
      {status && !result && <div className="hint" style={{ fontSize: "0.82rem" }}><span>{status}</span></div>}
      {error && <div className="error" role="alert"><Icons.AlertCircle size={14} /><span>{error}</span></div>}
      <p className="muted" style={{ fontSize: "0.72rem" }}>
        Honest pipeline: Camera → Face detection (tinyFaceDetector) → Quality validation → Face recognition model (128D embedding) → Server comparison (Euclidean distance ≤ {`0.6`} → match). No fake percentages; similarity is derived from real distance.
      </p>
    </div>
  );
}
