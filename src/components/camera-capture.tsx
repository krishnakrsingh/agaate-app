"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { Icons } from "./icons";

interface CameraCaptureProps {
  onCapture: (file: File, previewUrl: string) => void;
  onCancel?: () => void;
  autoStart?: boolean;
  title?: string;
}

export function CameraCapture({
  onCapture,
  onCancel,
  autoStart = true,
  title = "Live Presence Capture",
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera API is not supported on this browser.");
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      setIsCameraActive(false);
      const isDenied = err instanceof Error && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setCameraError(isDenied ? "Camera permission denied. Use file upload fallback below." : "Camera unavailable. Use fallback upload.");
    }
  }, []);

  useEffect(() => {
    if (autoStart && !isCameraActive && !cameraError) void startCamera();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, [autoStart, isCameraActive, cameraError, startCamera, stream]);

  function captureFrame() {
    if (!videoRef.current || !canvasRef.current || capturing) return;
    setCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 640;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      setCapturing(false);
      if (!blob) return;
      const file = new File([blob], `presence-selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
      const previewUrl = URL.createObjectURL(blob);
      stream?.getTracks().forEach((t) => t.stop());
      onCapture(file, previewUrl);
    }, "image/jpeg", 0.9);
  }

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    onCapture(file, URL.createObjectURL(file));
  }

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 20, display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong style={{ fontSize: "1rem" }}>{title}</strong>
        {onCancel && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
            <Icons.X size={16} />
          </button>
        )}
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 360, margin: "0 auto", aspectRatio: "1/1", borderRadius: "var(--radius-md)", overflow: "hidden", background: "#000" }}>
        <video ref={videoRef} playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {isCameraActive && (
          <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)" }}>
            <button type="button" className="btn btn-primary" onClick={captureFrame} disabled={capturing}>
              <Icons.Camera size={16} />
              <span>{capturing ? "Capturing…" : "Take Selfie"}</span>
            </button>
          </div>
        )}
      </div>

      {cameraError && (
        <div style={{ display: "grid", gap: 10 }}>
          <div className="error" role="alert"><Icons.AlertCircle size={15} /><span>{cameraError}</span></div>
          <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer", justifyContent: "center" }}>
            <Icons.Camera size={15} />
            <span>Select Photo from Device</span>
            <input type="file" accept="image/*" capture="user" onChange={handleFile} style={{ display: "none" }} />
          </label>
        </div>
      )}
    </div>
  );
}
