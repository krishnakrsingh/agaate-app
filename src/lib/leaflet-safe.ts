import * as L from "leaflet";

/**
 * Safely guards Leaflet's DOM utilities against unmounted/undefined elements.
 * Prevents `TypeError: Cannot read properties of undefined (reading '_leaflet_pos')`
 * during React unmounting, Fast Refresh, or layer removal.
 */
let isPatched = false;

export function ensureLeafletSafe(): void {
  if (isPatched || typeof window === "undefined" || !L || !L.DomUtil) return;
  isPatched = true;

  const origGet = L.DomUtil.getPosition;
  if (origGet) {
    L.DomUtil.getPosition = function (el?: HTMLElement | null): L.Point {
      if (!el) return new L.Point(0, 0);
      try {
        return origGet(el) || new L.Point(0, 0);
      } catch {
        return (el as unknown as { _leaflet_pos?: L.Point })._leaflet_pos || new L.Point(0, 0);
      }
    };
  }

  const origSet = L.DomUtil.setPosition;
  if (origSet) {
    L.DomUtil.setPosition = function (el: HTMLElement | null | undefined, point: L.Point) {
      if (!el) return;
      try {
        origSet(el, point);
      } catch {
        // ignore positioning on detached elements
      }
    };
  }
}

ensureLeafletSafe();
