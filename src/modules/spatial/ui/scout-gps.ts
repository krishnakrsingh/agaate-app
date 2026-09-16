/**
 * Shared field-GPS helpers (single home for scouting/completion location UX).
 * Server verdicts stay authoritative; these only acquire fixes and label bases.
 */

export function basisText(basis?: string | null) {
  if (basis === "PLOT_POLYGON") return "plot fence";
  if (basis === "FARM_POLYGON") return "farm fence";
  if (basis === "RADIUS") return "radius fallback (no fence drawn)";
  return "location check";
}

/** One-shot GPS for field evidence. Rejects when unavailable — callers proceed without GPS. */
export function captureFieldGps(): Promise<{ latitude: number; longitude: number; accuracyMeters: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not supported on this device."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        if (!Number.isFinite(p.coords.latitude) || !Number.isFinite(p.coords.longitude)) {
          reject(new Error("Location unavailable."));
          return;
        }
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracyMeters: typeof p.coords.accuracy === "number" ? p.coords.accuracy : 999,
        });
      },
      (err) =>
        reject(
          new Error(
            err.code === 1
              ? "Location permission was denied."
              : err.code === 3
                ? "Location timed out."
                : "Location is unavailable."
          )
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}
