/**
 * geo-policy — central policy for geometry governance. Thresholds and labels
 * live HERE, never scattered through routes or components.
 */

import type { BoundarySource } from "@prisma/client";

/** Flag a version when |area change| >= this fraction (0.10 = 10%). Advisory only — never blocks. */
export const AREA_CHANGE_FLAG_THRESHOLD = 0.1;

export const SOURCE_LABELS: Record<BoundarySource, string> = {
  MANUAL_DRAW: "Manual draw",
  GPS_WALK: "GPS walk",
  GRID_SPLIT: "Grid split",
  LEGACY: "Legacy (pre-history)",
};

export function areaChangeText(prevAcres: number | null, nextAcres: number | null): string | null {
  if (prevAcres === null || nextAcres === null) return null;
  const delta = nextAcres - prevAcres;
  const pct = prevAcres !== 0 ? (delta / prevAcres) * 100 : null;
  const sign = delta > 0 ? "+" : "";
  const pctText = pct === null ? "" : ` (${sign}${pct.toFixed(1)}%)`;
  return `${prevAcres.toFixed(2)} → ${nextAcres.toFixed(2)} ac (${sign}${delta.toFixed(2)}${pctText})`;
}
