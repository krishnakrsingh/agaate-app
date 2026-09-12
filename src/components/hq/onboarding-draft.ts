import { newIdempotencyKey, newRowId, type WizardData } from "./onboarding-schema";

// localStorage + factory helpers for the HQ onboarding wizard.
// Server drafts are the source of cross-device truth; localStorage is the
// offline safety net (a 20-farm form must survive a refresh or dead network).

export type StoredDraft = {
  draftId: string | null;
  idempotencyKey: string;
  updatedAt: string;
  data: WizardData;
};

export function storageKey(draftId: string | null): string {
  return `hq-onboarding:${draftId ?? "new"}`;
}

export function emptyWizard(idempotencyKey?: string): WizardData {
  return {
    idempotencyKey: idempotencyKey ?? newIdempotencyKey(),
    client: {
      name: "",
      companyName: null,
      phone: "",
      email: "",
      panNumber: "",
      gstin: "",
      billingAddress: "",
      state: "",
      district: "",
    },
    farms: [],
    plots: [],
    team: { mode: "create", name: "", email: "", phone: "", password: "", confirmPassword: "" },
  };
}

export function emptyFarm() {
  return {
    rowId: newRowId(),
    name: "",
    location: "",
    latitude: "" as unknown as number,
    longitude: "" as unknown as number,
    totalArea: "" as unknown as number,
    cultivableArea: "" as unknown as number,
    waterSource: "",
    surveyNumber: "",
    village: "",
    taluk: "",
    district: "",
    state: "",
    soilType: "",
    boundaryRing: null as null | [number, number][],
  };
}

export function loadLocal(draftId: string | null): StoredDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(draftId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed || typeof parsed !== "object" || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocal(draftId: string | null, stored: StoredDraft): void {
  try {
    window.localStorage.setItem(storageKey(draftId), JSON.stringify(stored));
  } catch {
    // Quota or private mode: server drafts still cover the online path.
  }
}

export function clearLocal(draftId: string | null): void {
  try {
    window.localStorage.removeItem(storageKey(draftId));
  } catch {
    // ignore
  }
}

/** Merge a possibly-stale payload onto a fresh shape so old drafts never crash the wizard. */
export function hydrate(payload: Partial<WizardData> | null | undefined, idempotencyKey: string): WizardData {
  const base = emptyWizard(idempotencyKey);
  if (!payload || typeof payload !== "object") return base;
  return {
    idempotencyKey: typeof payload.idempotencyKey === "string" ? payload.idempotencyKey : idempotencyKey,
    client: { ...base.client, ...(payload.client ?? {}) },
    farms: Array.isArray(payload.farms)
      ? payload.farms.map((f) => ({ ...emptyFarm(), ...(f as object), rowId: (f as { rowId?: string }).rowId || newRowId() }))
      : [],
    plots: Array.isArray(payload.plots)
      ? payload.plots.map((p) => ({ farmRowId: "", name: "", area: "" as unknown as number, soilType: "", ...(p as object) }))
      : [],
    team: { ...base.team, ...(payload.team ?? {}) },
  };
}
