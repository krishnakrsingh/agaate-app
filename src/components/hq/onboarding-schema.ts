import { z } from "zod";

// Single source of truth for the HQ onboarding wizard wire shape.
// Importable from client components AND route handlers (no server-only,
// no client directives in this file).

export const MAX_FARMS = 50;
export const MAX_PLOTS = 500;
export const MIN_PASSWORD_LENGTH = 12;

const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function normalizePhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const plus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length < 10 || digits.length > 15) return null;
  return plus ? `+${digits}` : digits;
}

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

export function newRowId(): string {
  try {
    return `row_${crypto.randomUUID().slice(0, 8)}`;
  } catch {
    return `row_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  }
}

export function newIdempotencyKey(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e12).toString(36)}`;
  }
}

/** Stable per-draft preview shown in Step 1 until the server assigns the real code. */
export function previewClientCode(idempotencyKey: string): string {
  const alnum = idempotencyKey.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `CLI-${(alnum + "XXXXXX").slice(0, 6)} (preview)`;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null));

const numField = (label: string, min: number, max: number) =>
  z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? undefined : v),
    z.coerce.number({ invalid_type_error: `${label} must be a number.` }).min(min, `${label} is out of range.`).max(max, `${label} is out of range.`)
  );

export const clientSchema = z
  .object({
    name: z.string().trim().min(2, "Client name is required.").max(120),
    companyName: optionalText(180),
    phone: z.string().trim().max(20).optional().nullable(),
    email: z.string().trim().max(254).optional().nullable(),
    panNumber: optionalText(20),
    gstin: optionalText(25),
    billingAddress: optionalText(500),
    state: optionalText(100),
    district: optionalText(100),
  })
  .superRefine((data, ctx) => {
    const phone = normalizePhone(data.phone ?? null);
    const email = normalizeEmail(data.email ?? null);
    if (data.phone?.trim() && !phone) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Phone must hold 10-15 digits." });
    }
    if (data.email?.trim() && !email) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "Email address is invalid." });
    }
    if (!phone && !email) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Either mobile number or email address is required." });
    }
    if (data.panNumber && !PAN_RE.test(data.panNumber.toUpperCase())) {
      ctx.addIssue({ code: "custom", path: ["panNumber"], message: "PAN must look like ABCDE1234F." });
    }
    if (data.gstin && !GSTIN_RE.test(data.gstin.toUpperCase())) {
      ctx.addIssue({ code: "custom", path: ["gstin"], message: "GSTIN must be a 15-character tax ID." });
    }
  });

/** Drawn boundary ring in [lng,lat] order (GeoMap shape). Null = pin only. */
const boundaryRingField = z
  .array(z.tuple([z.number().finite(), z.number().finite()]))
  .max(501)
  .optional()
  .nullable();

export const farmSchema = z
  .object({
    rowId: z.string().optional(),
    name: z.string().trim().min(2, "Farm name is required.").max(120),
    location: z.string().trim().min(2, "Location is required.").max(180),
    latitude: numField("Latitude", -90, 90),
    longitude: numField("Longitude", -180, 180),
    totalArea: numField("Total area", 0.01, 100000),
    cultivableArea: numField("Cultivable area", 0.01, 100000),
    waterSource: z.string().trim().min(2, "Water source is required.").max(300),
    surveyNumber: optionalText(100),
    village: optionalText(100),
    taluk: optionalText(100),
    district: optionalText(100),
    state: optionalText(100),
    soilType: optionalText(100),
    boundaryRing: boundaryRingField,
  })
  .superRefine((data, ctx) => {
    if (typeof data.totalArea === "number" && typeof data.cultivableArea === "number" && data.cultivableArea > data.totalArea) {
      ctx.addIssue({ code: "custom", path: ["cultivableArea"], message: "Cultivable area cannot exceed total area." });
    }
  });

export const plotSchema = z.object({
  rowId: z.string().optional(),
  farmRowId: z.string().min(1, "Plot must belong to a farm."),
  name: z.string().trim().min(2, "Plot name is required.").max(100),
  area: numField("Plot area", 0.01, 100000),
  soilType: optionalText(100),
  boundaryRing: boundaryRingField,
});

export const teamSchema = z
  .object({
    mode: z.enum(["create", "later"]),
    name: z.string().trim().max(100).optional().nullable(),
    email: z.string().trim().max(254).optional().nullable(),
    phone: z.string().trim().max(20).optional().nullable(),
    password: z.string().max(128).optional().nullable(),
    confirmPassword: z.string().max(128).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.mode === "later") return;
    if (!data.name?.trim() || data.name.trim().length < 2) {
      ctx.addIssue({ code: "custom", path: ["name"], message: "Admin name is required." });
    }
    if (!normalizeEmail(data.email ?? null)) {
      ctx.addIssue({ code: "custom", path: ["email"], message: "A valid admin email is required." });
    }
    if (data.phone?.trim() && !normalizePhone(data.phone)) {
      ctx.addIssue({ code: "custom", path: ["phone"], message: "Phone must hold 10-15 digits." });
    }
    if (!data.password || data.password.length < MIN_PASSWORD_LENGTH) {
      ctx.addIssue({ code: "custom", path: ["password"], message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
    }
  });

export const submitSchema = z
  .object({
    idempotencyKey: z.string().min(8).max(64),
    client: clientSchema,
    farms: z.array(farmSchema).max(MAX_FARMS, `Farm cap is ${MAX_FARMS} per onboarding.`),
    plots: z.array(plotSchema).max(MAX_PLOTS),
    team: teamSchema,
  })
  .superRefine((data, ctx) => {
    const farmIds = new Set(data.farms.map((f, i) => f.rowId ?? `index:${i}`));
    data.plots.forEach((p, i) => {
      if (!farmIds.has(p.farmRowId)) {
        ctx.addIssue({ code: "custom", path: ["plots", i, "farmRowId"], message: "Plot refers to a farm that no longer exists." });
      }
    });
    // DB enforces unique [farmId, name]: catch it here with row numbers.
    const seen = new Map<string, number>();
    data.plots.forEach((p, i) => {
      const key = `${p.farmRowId}::${p.name.trim().toLowerCase()}`;
      const first = seen.get(key);
      if (first !== undefined) {
        ctx.addIssue({ code: "custom", path: ["plots", i, "name"], message: `Duplicate of plot row ${first + 1} on the same farm.` });
      } else {
        seen.set(key, i);
      }
    });
    const cultivable = new Map<string, number>();
    data.farms.forEach((f, i) => cultivable.set(f.rowId ?? `index:${i}`, Number(f.cultivableArea)));
    const allocated = new Map<string, number>();
    data.plots.forEach((p, i) => {
      const cap = cultivable.get(p.farmRowId);
      if (cap !== undefined && Number(p.area) > cap) {
        ctx.addIssue({ code: "custom", path: ["plots", i, "area"], message: "Plot area exceeds its farm's cultivable area." });
      }
      allocated.set(p.farmRowId, (allocated.get(p.farmRowId) ?? 0) + Number(p.area || 0));
    });
    allocated.forEach((sum, farmRowId) => {
      const cap = cultivable.get(farmRowId);
      const fi = data.farms.findIndex((f, i) => (f.rowId ?? `index:${i}`) === farmRowId);
      if (cap !== undefined && Number.isFinite(cap) && sum > cap && fi >= 0) {
        ctx.addIssue({ code: "custom", path: ["farms", fi, "cultivableArea"], message: `Plots allocate ${sum.toFixed(2)} ac — exceeds cultivable ${cap.toFixed(2)} ac.` });
      }
    });
  });

export type ClientInput = z.infer<typeof clientSchema>;
export type FarmInput = z.infer<typeof farmSchema>;
export type PlotInput = z.infer<typeof plotSchema>;
export type TeamInput = z.infer<typeof teamSchema>;
export type WizardData = z.infer<typeof submitSchema>;

/** Flatten a Zod error to a path-keyed map for inline field display. */
export function flattenIssues(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join(".");
    if (key && !out[key]) out[key] = issue.message;
  }
  return out;
}
