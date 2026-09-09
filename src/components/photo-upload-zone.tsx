"use client";
/* eslint-disable @next/next/no-img-element */
import { useState, useRef, useEffect, useCallback, ChangeEvent } from "react";
import { Icons } from "./icons";
import { compressImage } from "@/lib/image-compress";

export interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  source: "camera" | "file";
}

interface PhotoUploadZoneProps {
  farmId: string;
  kind?: "INCIDENT_PHOTO" | "CROP_PHOTO" | "ACTIVITY_EVIDENCE";
  maxPhotos?: number;
  onPhotosChange: (photos: PhotoItem[]) => void;
  isUploading?: boolean;
}

export function PhotoUploadZone({
  farmId,
  kind = "INCIDENT_PHOTO",
  maxPhotos = 6,
  onPhotosChange,
  isUploading = false,
}: PhotoUploadZoneProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notify parent whenever photos change
  const notifyChange = (newPhotos: PhotoItem[]) => {
    setPhotos(newPhotos);
    onPhotosChange(newPhotos);
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera hardware API is not supported on this browser.");
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = mediaStream;
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      setIsCameraActive(false);
      const isDenied =
        err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      setCameraError(
        isDenied
          ? "Camera permission denied. Please allow camera access in browser or choose files from device."
          : "Rear field camera unavailable. Please choose photo from files."
      );
    }
  }, [facingMode, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  useEffect(() => {
    if (isCameraActive) {
      void startCamera();
    }
  }, [facingMode]);

  const captureCameraFrame = () => {
    if (!videoRef.current || !canvasRef.current || capturing) return;
    setCapturing(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setCapturing(false);
      return;
    }

    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        setCapturing(false);
        if (!blob) return;
        const file = new File(
          [blob],
          `incident-photo-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );
        const previewUrl = URL.createObjectURL(blob);
        const newItem: PhotoItem = {
          id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          file,
          previewUrl,
          source: "camera",
        };

        const updated = [...photos, newItem].slice(0, maxPhotos);
        notifyChange(updated);
        stopCamera();
      },
      "image/jpeg",
      0.88
    );
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    const newItems: PhotoItem[] = selectedFiles.map((file) => ({
      id: `photo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      source: "file",
    }));

    const updated = [...photos, ...newItems].slice(0, maxPhotos);
    notifyChange(updated);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removePhoto = (id: string) => {
    const updated = photos.filter((p) => p.id !== id);
    notifyChange(updated);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <label style={{ margin: 0, fontWeight: 600, color: "var(--ink)", fontSize: 13 }}>
          Visual Evidence Photos ({photos.length}/{maxPhotos})
        </label>
        <span className="muted" style={{ fontSize: 11 }}>
          High-resolution photos are encrypted &amp; verified on S3
        </span>
      </div>

      {/* ACTION BUTTONS: Live Camera vs Browse Gallery */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {!isCameraActive ? (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={startCamera}
            disabled={photos.length >= maxPhotos || isUploading}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Icons.Camera size={15} />
            <span>Open Field Camera</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-sm btn-danger"
            onClick={stopCamera}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Icons.X size={15} />
            <span>Close Camera</span>
          </button>
        )}

        <button
          type="button"
          className="btn btn-sm btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          disabled={photos.length >= maxPhotos || isUploading}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Icons.Upload size={15} />
          <span>Upload From Gallery / Files</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          style={{ display: "none" }}
          onChange={handleFileInputChange}
        />
      </div>

      {/* CAMERA ERROR BANNER */}
      {cameraError && (
        <div
          className="alert alert-danger"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            fontSize: 12,
          }}
        >
          <Icons.AlertTriangle size={14} />
          <span>{cameraError}</span>
        </div>
      )}

      {/* LIVE CAMERA VIEWER */}
      {isCameraActive && (
        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 480,
            borderRadius: "var(--radius-sm)",
            overflow: "hidden",
            backgroundColor: "#000",
            border: "2px solid var(--red)",
            aspectRatio: "16/9",
            margin: "4px 0",
          }}
        >
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <canvas ref={canvasRef} style={{ display: "none" }} />

          {/* Camera Controls Overlay */}
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              display: "flex",
              gap: 8,
            }}
          >
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              style={{
                backgroundColor: "rgba(0, 0, 0, 0.6)",
                color: "#fff",
                border: "none",
                padding: "4px 8px",
              }}
              onClick={toggleCameraFacing}
              title="Flip Front/Rear Camera"
            >
              <Icons.Refresh size={13} />
              <span style={{ fontSize: 11 }}>Flip</span>
            </button>
          </div>

          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <button
              type="button"
              className="btn btn-danger btn-sm"
              style={{
                borderRadius: "50%",
                width: 52,
                height: 52,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 12px rgba(239, 68, 68, 0.6)",
              }}
              onClick={captureCameraFrame}
              disabled={capturing}
              title="Capture Evidence Photo"
            >
              <Icons.Camera size={22} />
            </button>
          </div>
        </div>
      )}

      {/* THUMBNAIL PREVIEWS STRIP */}
      {photos.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
              gap: 10,
            }}
          >
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1/1",
                  borderRadius: "var(--radius-xs)",
                  overflow: "hidden",
                  border: "1px solid var(--line)",
                  backgroundColor: "var(--canvas)",
                }}
              >
                <img
                  src={photo.previewUrl}
                  alt={`Evidence preview ${index + 1}`}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />

                {/* Remove Photo Button */}
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  disabled={isUploading}
                  style={{
                    position: "absolute",
                    top: 4,
                    right: 4,
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  title="Remove photo"
                >
                  <Icons.X size={12} />
                </button>

                {/* Source Badge */}
                <span
                  style={{
                    position: "absolute",
                    bottom: 4,
                    left: 4,
                    backgroundColor: "rgba(0, 0, 0, 0.6)",
                    color: "#fff",
                    fontSize: 9,
                    padding: "1px 4px",
                    borderRadius: 2,
                    textTransform: "uppercase",
                  }}
                >
                  {photo.source} #{index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty Helper Dropzone */}
      {photos.length === 0 && !isCameraActive && (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "1px dashed var(--line)",
            padding: "20px 16px",
            textAlign: "center",
            cursor: "pointer",
            backgroundColor: "var(--canvas)",
            borderRadius: "var(--radius-xs)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icons.Image size={24} style={{ color: "var(--muted)" }} />
          <div style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
            No visual evidence attached yet
          </div>
          <div className="muted" style={{ fontSize: 11 }}>
            Click here to browse gallery or tap &ldquo;Open Field Camera&rdquo; to snap live photos
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Upload helper: Presigns, PUTs to S3, and verifies completion on server.
 * Resiliently falls back to direct server upload endpoint if S3 is unavailable.
 */
export async function uploadEvidencePhotos(
  farmId: string,
  kind: "INCIDENT_PHOTO" | "CROP_PHOTO" | "ACTIVITY_EVIDENCE",
  photos: PhotoItem[],
  onProgress?: (index: number, total: number) => void
): Promise<string[]> {
  const mediaIds: string[] = [];
  for (let i = 0; i < photos.length; i++) {
    const item = photos[i];
    onProgress?.(i + 1, photos.length);

    // Compress photo to eliminate timeout errors on mobile devices
    const compressed = await compressImage(item.file);

    try {
      // 1. Presign upload URL
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          kind,
          mimeType: compressed.type || "image/jpeg",
          sizeBytes: compressed.size,
        }),
      });

      if (!presignRes.ok) throw new Error("Presign failed");
      const { uploadUrl, mediaId } = await presignRes.json();

      // 2. Direct S3 PUT
      const s3Res = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": compressed.type || "image/jpeg" },
        body: compressed,
      });

      if (!s3Res.ok) throw new Error("S3 PUT failed");

      // 3. Server-side verification
      const completeRes = await fetch(`/api/uploads/${mediaId}/complete`, {
        method: "POST",
      });

      if (!completeRes.ok) {
        const err = await completeRes.json().catch(() => ({}));
        throw new Error(err.error || "Verification failed");
      }
      mediaIds.push(mediaId);
    } catch {
      // Resilient fallback: direct server upload endpoint
      const formData = new FormData();
      formData.append("file", compressed);
      formData.append("farmId", farmId);
      formData.append("kind", kind);

      const directRes = await fetch("/api/uploads/direct", {
        method: "POST",
        body: formData,
      });

      if (!directRes.ok) {
        const err = await directRes.json().catch(() => ({}));
        throw new Error(err.error || `Upload failed for photo ${i + 1}`);
      }

      const { mediaId } = await directRes.json();
      mediaIds.push(mediaId);
    }
  }

  return mediaIds;
}
