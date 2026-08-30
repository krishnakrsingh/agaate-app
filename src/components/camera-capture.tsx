"use client";
import { useState, useRef, useEffect, useCallback } from "react";
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
  const [countdown, setCountdown] = useState<number | null>(null);
  const [lightingStatus, setLightingStatus] = useState<"GOOD" | "LOW" | "NORMAL">("NORMAL");

  // Start live front camera stream
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported on this browser or environment.");
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640, min: 480 },
          height: { ideal: 640, min: 480 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.warn("Live camera access error:", err);
      setIsCameraActive(false);
      const isPermission =
        err instanceof Error && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      setCameraError(
        isPermission
          ? "Camera permission was denied. Please allow camera access in browser settings to capture presence."
          : "Unable to access front camera. Please verify device camera and retry."
      );
    }
  }, []);

  // Auto-start camera if requested
  useEffect(() => {
    if (autoStart && !isCameraActive && !cameraError) {
      void startCamera();
    }
  }, [autoStart, isCameraActive, cameraError, startCamera]);

  // Clean up camera stream on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  // Periodically check video brightness/lighting to guide the user
  useEffect(() => {
    if (!isCameraActive || !videoRef.current || !canvasRef.current) return;

    const interval = setInterval(() => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || video.videoWidth === 0) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = 64;
      canvas.height = 64;
      ctx.drawImage(video, 0, 0, 64, 64);

      try {
        const frameData = ctx.getImageData(0, 0, 64, 64).data;
        let totalBrightness = 0;
        for (let i = 0; i < frameData.length; i += 4) {
          totalBrightness += frameData[i] * 0.299 + frameData[i + 1] * 0.587 + frameData[i + 2] * 0.114;
        }
        const avgBrightness = totalBrightness / (frameData.length / 4);

        if (avgBrightness < 45) {
          setLightingStatus("LOW");
        } else if (avgBrightness > 80 && avgBrightness < 220) {
          setLightingStatus("GOOD");
        } else {
          setLightingStatus("NORMAL");
        }
      } catch {
        // ignore cross-origin canvas read
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isCameraActive]);

  // Capture frame directly from live video stream
  function captureLiveSnapshot() {
    if (!videoRef.current || !canvasRef.current || capturing) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setCapturing(true);

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 640;
    canvas.width = width;
    canvas.height = height;

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) return;

        const file = new File([blob], `presence-selfie-${Date.now()}.jpg`, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        const previewUrl = URL.createObjectURL(blob);

        if (stream) {
          stream.getTracks().forEach((t) => t.stop());
        }

        onCapture(file, previewUrl);
      },
      "image/jpeg",
      0.92
    );
  }

  function triggerCountdown() {
    if (countdown !== null || capturing) return;
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          captureLiveSnapshot();
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }

  return (
    <div
      style={{
        background: "var(--slate-900)",
        borderRadius: "var(--radius-lg)",
        color: "#ffffff",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        boxShadow: "var(--shadow-lg)",
        position: "relative",
        overflow: "hidden",
        border: "1px solid var(--slate-700)",
        maxWidth: 440,
        width: "100%",
        margin: "0 auto",
      }}
    >
      {/* Viewfinder Header */}
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 14,
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
          <span style={{ fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            {title}
          </span>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {lightingStatus === "LOW" && (
            <span
              style={{
                background: "rgba(239, 68, 68, 0.2)",
                color: "#fca5a5",
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                fontSize: "0.72rem",
                fontWeight: 600,
              }}
            >
              Low Light
            </span>
          )}
          {lightingStatus === "GOOD" && (
            <span
              style={{
                background: "rgba(16, 185, 129, 0.2)",
                color: "#6ee7b7",
                padding: "2px 8px",
                borderRadius: "var(--radius-pill)",
                fontSize: "0.72rem",
                fontWeight: 600,
              }}
            >
              Good Light
            </span>
          )}
          <span
            style={{
              background: isCameraActive ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
              color: isCameraActive ? "#34d399" : "#fbbf24",
              padding: "2px 8px",
              borderRadius: "var(--radius-pill)",
              fontSize: "0.72rem",
              fontWeight: 700,
            }}
          >
            {isCameraActive ? "LIVE" : "READY"}
          </span>
        </div>
      </div>

      {/* Camera Viewfinder Box */}
      <div
        style={{
          width: "100%",
          height: 280,
          background: "#090d16",
          borderRadius: "var(--radius-md)",
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
          border: isCameraActive ? "2px solid rgba(16, 185, 129, 0.4)" : "2px dashed var(--slate-700)",
        }}
      >
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: "scaleX(-1)", // Mirror video for intuitive selfie experience
            display: isCameraActive ? "block" : "none",
          }}
        />

        {/* Hidden Canvas for High-Res Extraction */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        {/* Viewfinder Target Framing Overlay */}
        {isCameraActive && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 170,
                height: 220,
                borderRadius: "50% 50% 45% 45%",
                border: "2px dashed rgba(255, 255, 255, 0.5)",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.35)",
              }}
            />
          </div>
        )}

        {/* Countdown Overlay */}
        {countdown !== null && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 10,
            }}
          >
            <span
              style={{
                fontSize: "4.5rem",
                fontWeight: 900,
                color: "var(--coral)",
                animation: "pulse 1s infinite",
              }}
            >
              {countdown}
            </span>
          </div>
        )}

        {/* Fallback when Camera is Off or Errored */}
        {!isCameraActive && (
          <div
            style={{
              padding: "24px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            {cameraError ? (
              <>
                <Icons.AlertCircle size={32} style={{ color: "#ef4444" }} />
                <p style={{ fontSize: "0.82rem", color: "#fca5a5", margin: 0, lineHeight: 1.4 }}>
                  {cameraError}
                </p>
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="btn btn-sm"
                  style={{
                    background: "var(--slate-800)",
                    color: "white",
                    border: "1px solid var(--slate-600)",
                    marginTop: 4,
                  }}
                >
                  <Icons.Camera size={14} /> Retry Camera
                </button>
              </>
            ) : (
              <>
                <Icons.Camera size={36} style={{ color: "var(--slate-500)" }} />
                <p style={{ fontSize: "0.85rem", color: "var(--slate-400)", margin: 0 }}>
                  Camera access required for physical attendance verification.
                </p>
                <button
                  type="button"
                  onClick={() => void startCamera()}
                  className="btn btn-sm btn-primary"
                  style={{ marginTop: 4 }}
                >
                  Start Camera
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div
        style={{
          width: "100%",
          display: "flex",
          gap: 10,
          marginTop: 16,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {onCancel && (
          <button
            type="button"
            onClick={() => {
              if (stream) stream.getTracks().forEach((t) => t.stop());
              onCancel();
            }}
            className="btn btn-sm"
            style={{
              background: "transparent",
              color: "var(--slate-400)",
              border: "1px solid var(--slate-700)",
            }}
          >
            Cancel
          </button>
        )}

        {isCameraActive && (
          <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
            <button
              type="button"
              onClick={triggerCountdown}
              disabled={capturing || countdown !== null}
              className="btn btn-sm"
              style={{
                background: "var(--slate-800)",
                color: "white",
                border: "1px solid var(--slate-600)",
              }}
              title="3-Second Timer"
            >
              Timer (3s)
            </button>

            <button
              type="button"
              onClick={captureLiveSnapshot}
              disabled={capturing || countdown !== null}
              className="btn btn-sm btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 18px",
                fontWeight: 700,
              }}
            >
              <Icons.Camera size={14} />
              <span>{capturing ? "Capturing..." : "Capture Photo"}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
