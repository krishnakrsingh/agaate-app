"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { Icons } from "./icons";

interface IdentitySelfieScannerProps {
  onCapture: (file: File, previewUrl: string) => void;
  onCancel?: () => void;
}

export function BiometricFaceScanner({ onCapture, onCancel }: IdentitySelfieScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Position your face clearly within the frame");

  // Start live front camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Live video camera is not supported on this browser.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 640 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setStatusMessage("Camera ready. Capture a clear field selfie.");
    } catch (err) {
      console.warn("Live camera access failed, falling back to snapshot mode:", err);
      setIsCameraActive(false);
      setCameraError(
        "Live camera preview requires browser permission. You can also upload a clear field photo."
      );
    }
  }, []);

  // Stop camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Capture image from canvas and return real File object
  function processCanvasAndComplete(canvas: HTMLCanvasElement) {
    setCapturing(true);
    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        const previewUrl = URL.createObjectURL(blob);
        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }
        onCapture(file, previewUrl);
      },
      "image/jpeg",
      0.9
    );
  }

  // Trigger capture from live video
  function captureLiveSnapshot() {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    processCanvasAndComplete(canvas);
  }

  // Fallback file input change
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (event) => {
      img.onload = () => {
        if (!canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        processCanvasAndComplete(canvas);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      style={{
        background: "var(--slate-900)",
        borderRadius: "var(--radius-xl)",
        color: "#ffffff",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxShadow: "var(--shadow-xl)",
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--slate-700)",
        maxWidth: 420,
        width: "100%",
        margin: "0 auto",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: isCameraActive ? "#10b981" : "#f59e0b",
              boxShadow: isCameraActive ? "0 0 10px #10b981" : "none",
            }}
          />
          <span style={{ fontSize: "0.85rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            Identity Selfie Capture
          </span>
        </div>

        <span
          style={{
            background: isCameraActive ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
            color: isCameraActive ? "#34d399" : "#fbbf24",
            padding: "2px 8px",
            borderRadius: "var(--radius-full)",
            fontSize: "0.75rem",
            fontWeight: 600,
          }}
        >
          {isCameraActive ? "Live Camera" : "Ready"}
        </span>
      </div>

      {/* Camera Viewport / Frame */}
      <div
        style={{
          position: "relative",
          width: "280px",
          height: "280px",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          background: "#0f172a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {isCameraActive ? (
          <video
            ref={videoRef}
            playsInline
            muted
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)", // Mirror front camera
            }}
          />
        ) : (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Icons.Camera size={44} style={{ color: "var(--slate-500)", margin: "0 auto 12px" }} />
            <p style={{ fontSize: "0.85rem", color: "var(--slate-300)", margin: 0 }}>
              Live front-camera view
            </p>
          </div>
        )}

        {/* Framing Guide */}
        <div
          style={{
            position: "absolute",
            width: "170px",
            height: "220px",
            borderRadius: "50%",
            border: "2px dashed rgba(255, 255, 255, 0.4)",
            pointerEvents: "none",
          }}
        />

        {/* Corner Guide Brackets */}
        <div style={{ position: "absolute", top: 12, left: 12, width: 14, height: 14, borderTop: "2px solid #10b981", borderLeft: "2px solid #10b981" }} />
        <div style={{ position: "absolute", top: 12, right: 12, width: 14, height: 14, borderTop: "2px solid #10b981", borderRight: "2px solid #10b981" }} />
        <div style={{ position: "absolute", bottom: 12, left: 12, width: 14, height: 14, borderBottom: "2px solid #10b981", borderLeft: "2px solid #10b981" }} />
        <div style={{ position: "absolute", bottom: 12, right: 12, width: 14, height: 14, borderBottom: "2px solid #10b981", borderRight: "2px solid #10b981" }} />
      </div>

      {/* Status Feedback */}
      <div style={{ textAlign: "center", marginTop: 14, marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--slate-300)", fontWeight: 500 }}>
          {capturing ? "Capturing selfie photo…" : statusMessage}
        </p>
      </div>

      {/* Hidden Processing Canvas */}
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* Action Controls */}
      <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "center", flexWrap: "wrap" }}>
        {!isCameraActive ? (
          <>
            <button
              type="button"
              className="btn btn-primary"
              onClick={startCamera}
              style={{ flex: 1, minHeight: 44 }}
            >
              <Icons.Camera size={16} />
              <span>Launch Camera</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => fileInputRef.current?.click()}
              style={{ minHeight: 44 }}
            >
              <Icons.Upload size={16} />
              <span>Upload Photo</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={captureLiveSnapshot}
            disabled={capturing}
            style={{
              flex: 1,
              minHeight: 48,
              background: "#10b981",
              borderColor: "#059669",
              boxShadow: "0 0 16px rgba(16, 185, 129, 0.4)",
            }}
          >
            <Icons.CheckCircle size={18} />
            <span>{capturing ? "Capturing…" : "Take Field Selfie"}</span>
          </button>
        )}

        {onCancel && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              if (stream) stream.getTracks().forEach((t) => t.stop());
              onCancel();
            }}
            style={{ color: "var(--slate-300)", borderColor: "var(--slate-600)" }}
          >
            Cancel
          </button>
        )}
      </div>

      {cameraError && (
        <p style={{ fontSize: "0.78rem", color: "#f87171", margin: "12px 0 0", textAlign: "center" }}>
          {cameraError}
        </p>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />
    </div>
  );
}

