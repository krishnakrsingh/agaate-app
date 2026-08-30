"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { Icons } from "../icons";
import { checkQuality } from "@/lib/face-client";
import { FACE_ENROLLMENT_FRAMES_REQUIRED } from "@/lib/face-config";

type Props = { onEnrolled?: () => void };

export function FaceEnrollment({ onEnrolled }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [consent, setConsent] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<number[][]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [qualityScores, setQualityScores] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const modelMeta = { modelId: "face-api-vladmandic", modelVersion: "0.2.0" };

  const loadModels = useCallback(async () => {
    if (modelsLoaded || modelsLoading) return;
    setModelsLoading(true);
    setModelsError("");
    try {
      const faceapi: any = await import("@vladmandic/face-api");
      await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
      await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
      await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
      setModelsLoaded(true);
      setStatus("Face recognition model loaded (6.7 MB). Ready for enrollment.");
    } catch (e) {
      setModelsError(e instanceof Error ? e.message : "Models failed to load. Check /models assets.");
    } finally {
      setModelsLoading(false);
    }
  }, [modelsLoaded, modelsLoading]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  async function startCamera() {
    setError("");
    try {
      const ms = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } }, audio: false });
      setStream(ms);
      if (videoRef.current) {
        videoRef.current.srcObject = ms;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setStatus("Camera active. Capture clear front-facing photos — 3 frames required.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Camera unavailable.");
    }
  }

  async function captureOne() {
    if (!modelsLoaded) {
      setError("Face recognition model not loaded yet.");
      return;
    }
    if (!videoRef.current || !canvasRef.current) return;
    setError("");
    setStatus("Detecting face…");
    try {
      const faceapi: any = await import("@vladmandic/face-api");
      const video = videoRef.current;

      // Single face detection with descriptor
      const detection: any = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setError("No face detected. Center your face and try again.");
        setStatus("");
        return;
      }

      // Multiple faces check via detectAll
      const all: any[] = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.5 }));
      if (all.length > 1) {
        setError(`Multiple faces detected (${all.length}). Ensure only you are in frame.`);
        setStatus("");
        return;
      }

      const score = detection.detection.score as number;
      const box = detection.detection.box as { width: number; height: number };
      const quality = checkQuality({ score, box });
      if (!quality.valid) {
        setError(quality.reason ?? "Quality check failed.");
        setStatus("");
        return;
      }

      const descriptor: number[] = Array.from(detection.descriptor as Float32Array);
      if (descriptor.length !== 128) {
        setError(`Unexpected descriptor length ${descriptor.length}.`);
        return;
      }

      const next = [...captured, descriptor];
      const nextScores = [...qualityScores, score];
      setCaptured(next);
      setQualityScores(nextScores);
      setStatus(`Captured ${next.length}/${FACE_ENROLLMENT_FRAMES_REQUIRED} valid frames — ${score.toFixed(2)} confidence, ${Math.round(box.width)}px face.`);
      if (next.length >= FACE_ENROLLMENT_FRAMES_REQUIRED) {
        setStatus(`Collected ${next.length} frames. Review and submit enrollment.`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Face detection failed.");
      setStatus("");
    }
  }

  function clearCaptures() {
    setCaptured([]);
    setQualityScores([]);
    setError("");
    setStatus("Cleared. Capture 3 frames again.");
  }

  async function submit() {
    if (!consent) {
      setError("Please provide explicit consent before enrolling.");
      return;
    }
    if (captured.length < FACE_ENROLLMENT_FRAMES_REQUIRED) {
      setError(`Need ${FACE_ENROLLMENT_FRAMES_REQUIRED} valid frames, have ${captured.length}.`);
      return;
    }
    setSubmitting(true);
    setError("");
    setStatus("Encrypting and storing reference embedding…");
    try {
      const res = await fetch("/api/biometric/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeddings: captured,
          modelId: modelMeta.modelId,
          modelVersion: modelMeta.modelVersion,
          consent: true,
          qualityScores,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Enrollment failed.");
      setStatus(`✓ Face enrollment complete — ${body.enrollmentCount} frames, model ${body.model.modelId}@${body.model.modelVersion}. Reference encrypted.`);
      setError("");
      if (onEnrolled) onEnrolled();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Enrollment failed.");
      setStatus("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-lg)", padding: 16, background: "var(--bg-card)", display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Icons.User size={18} style={{ color: "var(--primary-600)" }} />
        <strong>Face Enrollment — Consent Required</strong>
      </div>

      <div style={{ background: "var(--slate-50)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", padding: 12, fontSize: "0.82rem" }}>
        <label className="check" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: 4 }} />
          <span>
            I consent to Agaate capturing and storing an encrypted face reference for identity verification. Purpose: attendance proof.
            Minimum data (128D embedding) is stored encrypted with AES-256-GCM; raw photos are not retained by default. Retention: until revocation/offboarding; revocation via this page deletes reference immediately. Model: {modelMeta.modelId}@{modelMeta.modelVersion}. See privacy docs.
          </span>
        </label>
      </div>

      <div style={{ position: "relative", width: 320, height: 320, borderRadius: "var(--radius-lg)", overflow: "hidden", background: "#0f172a", margin: "0 auto", border: "2px solid var(--border-subtle)" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: cameraActive ? "block" : "none" }} />
        {!cameraActive && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--slate-400)", flexDirection: "column", gap: 8 }}>
            <Icons.Camera size={36} />
            <span style={{ fontSize: "0.85rem" }}>Front camera preview</span>
          </div>
        )}
        <div style={{ position: "absolute", width: 180, height: 220, left: "50%", top: "50%", transform: "translate(-50%,-50%)", borderRadius: "50%", border: "2px dashed rgba(255,255,255,0.4)", pointerEvents: "none" }} />
      </div>

      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
        {!cameraActive ? (
          <button type="button" className="btn btn-primary" onClick={startCamera} style={{ minHeight: 44 }}>
            <Icons.Camera size={16} />
            <span>Launch Camera</span>
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={captureOne} disabled={!modelsLoaded || submitting} style={{ minHeight: 44 }}>
            <Icons.CheckCircle size={16} />
            <span>Capture Frame ({captured.length}/{FACE_ENROLLMENT_FRAMES_REQUIRED})</span>
          </button>
        )}
        <button type="button" className="btn btn-secondary" onClick={clearCaptures} disabled={!captured.length} style={{ minHeight: 44 }}>
          <span>Clear</span>
        </button>
      </div>

      {modelsLoading && <p className="muted" style={{ fontSize: "0.82rem", textAlign: "center" }}>Loading face recognition model (6.7 MB)…</p>}
      {modelsError && <div className="error" role="alert"><span>{modelsError}</span></div>}
      {!modelsLoaded && !modelsLoading && !modelsError && <p className="muted" style={{ fontSize: "0.82rem", textAlign: "center" }}>Model not yet loaded.</p>}
      {captured.length > 0 && (
        <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
          {captured.map((_, i) => (
            <span key={i} style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--primary-100)", color: "var(--primary-700)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem" }}>{i + 1}</span>
          ))}
        </div>
      )}

      {status && <div className="hint" role="status" style={{ fontSize: "0.82rem" }}><span>{status}</span></div>}
      {error && <div className="error" role="alert"><Icons.AlertCircle size={14} /><span>{error}</span></div>}

      <button type="button" className="btn btn-primary" onClick={submit} disabled={submitting || captured.length < FACE_ENROLLMENT_FRAMES_REQUIRED || !consent} style={{ minHeight: 48 }}>
        <Icons.Check size={16} />
        <span>{submitting ? "Storing…" : "Submit Enrollment (Encrypted)"}</span>
      </button>

      <p className="muted" style={{ fontSize: "0.72rem" }}>
        Pipeline: Camera → Face detection (tinyFaceDetector) → Quality validation → Face recognition model → 128D embedding → Encrypted reference (AES-GCM). No fake confidence; similarity measured server-side Euclidean distance vs threshold {`0.6`} (thresholdVersion 2026-08-31-v1).
      </p>
    </div>
  );
}
