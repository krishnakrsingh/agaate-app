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

export function storageKey(draftId: string | null, existingClientId?: string | null): string {
  if (existingClientId) return `hq-onboarding:client:${existingClientId}`;
  return `hq-onboarding:${draftId ?? "new"}`;
}

export function emptyWizard(idempotencyKey?: string): WizardData {
  return {
    idempotencyKey: idempotencyKey ?? newIdempotencyKey(),
    client: {
      name: "",
      companyName: null,
      phone: "",
      whatsappNo: "",
      email: "",
      panNumber: "",
      gstin: "",
      billingAddress: "",
      village: "",
      city: "",
      state: "",
      district: "",
      pincode: "",
      financeConnect: "",
      purchaserConnect: "",
      localConnectName: "",
      localConnectPhone: "",
      localConnectSameAsClient: false,
    },
    contacts: {
      financeContact: null,
      purchaserContact: null,
      additionalContacts: [],
    },
    farms: [emptyFarm()],
    plots: [],
    crops: [],
    team: {
      mode: "create",
      name: "",
      email: "",
      phone: "",
      password: "",
      confirmPassword: "",
      agronomistId: null,
      agronomistName: null,
      fieldOfficerId: null,
      fieldOfficerName: null,
      createFirstTask: false,
      firstTaskTitle: "Initial Demarcation & Soil Testing",
    },
  };
}

export function emptyFarm() {
  return {
    rowId: newRowId(),
    name: "",
    area: "" as unknown as number,
    areaUnit: "Acre" as const,
    totalArea: "" as unknown as number,
    cultivableArea: "" as unknown as number,
    localConnect: "",
    localContactId: null,
    localContactName: null,
    localContactPhone: null,
    localConnectSameAsClient: false,
    location: "",
    latitude: "" as unknown as number,
    longitude: "" as unknown as number,
    waterSource: "",
    surveyNumber: "",
    village: "",
    city: "",
    taluk: "",
    district: "",
    state: "",
    pincode: "",
    sameAsClientAddress: false,
    soilType: "",
    boundaryRing: null as null | [number, number][],
  };
}

export function emptyPlot(farmRowId: string) {
  return {
    rowId: newRowId(),
    farmRowId,
    name: "",
    area: "" as unknown as number,
    soilType: "",
    irrigationSetup: "Drip Irrigation",
    valves: "",
    bedDetails: "",
    landPrepStatus: "Ready for Planting",
    boundaryRing: null as null | [number, number][],
  };
}

export function emptyCrop(plotRowId: string) {
  return {
    rowId: newRowId(),
    plotRowId,
    cropName: "",
    plantingMethod: "Nursery Transplantation",
    spacing: "",
    basalDose: "",
    mulching: "Silver-Black 25 micron",
    plantingDate: new Date().toISOString().slice(0, 10),
    expectedHarvestDate: "",
    keyDates: "",
  };
}

export function loadLocal(draftId: string | null, existingClientId?: string | null): StoredDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(draftId, existingClientId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed || typeof parsed !== "object" || !parsed.data) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveLocal(draftId: string | null, stored: StoredDraft, existingClientId?: string | null): void {
  try {
    window.localStorage.setItem(storageKey(draftId, existingClientId), JSON.stringify(stored));
  } catch {
    // Quota or private mode: server drafts still cover the online path.
  }
}

export function clearLocal(draftId: string | null, existingClientId?: string | null): void {
  try {
    window.localStorage.removeItem(storageKey(draftId, existingClientId));
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
    contacts: { ...base.contacts, ...(payload.contacts ?? {}) },
    farms: Array.isArray(payload.farms) && payload.farms.length > 0
      ? payload.farms.map((f) => ({ ...emptyFarm(), ...(f as object), rowId: (f as { rowId?: string }).rowId || newRowId() }))
      : [emptyFarm()],
    plots: Array.isArray(payload.plots)
      ? payload.plots.map((p) => ({ ...emptyPlot(""), ...(p as object), rowId: (p as { rowId?: string }).rowId || newRowId() }))
      : [],
    crops: Array.isArray(payload.crops)
      ? payload.crops.map((c) => ({ ...emptyCrop(""), ...(c as object), rowId: (c as { rowId?: string }).rowId || newRowId() }))
      : [],
    team: { ...base.team, ...(payload.team ?? {}) },
  };
}
