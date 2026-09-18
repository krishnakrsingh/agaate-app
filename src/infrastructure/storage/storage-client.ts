import "server-only";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const env = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured.`);
  return value;
};

let cached: S3Client | null = null;

const client = () => {
  if (cached) return cached;
  const endpoint = env("S3_ENDPOINT");
  // R2 requires region "auto" and virtual-hosted style (forcePathStyle=false).
  const region = process.env.S3_REGION || (endpoint.includes("r2.cloudflarestorage.com") ? "auto" : "us-east-1");
  const forcePathStyle =
    process.env.S3_FORCE_PATH_STYLE === "true"
      ? true
      : process.env.S3_FORCE_PATH_STYLE === "false"
      ? false
      : endpoint.includes("localhost") || endpoint.includes("127.0.0.1");

  cached = new S3Client({
    endpoint,
    region,
    forcePathStyle,
    credentials: {
      accessKeyId: env("S3_ACCESS_KEY_ID"),
      secretAccessKey: env("S3_SECRET_ACCESS_KEY"),
    },
  });
  return cached;
};

const bucket = () => env("S3_BUCKET");

function assertKey(key: string) {
  if (!key.startsWith("evidence/") || key.includes("..") || key.length > 512) {
    throw new Error("Invalid storage key.");
  }
}

export async function uploadUrl(key: string, mimeType: string) {
  assertKey(key);
  return getSignedUrl(
    client(),
    new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: mimeType }),
    { expiresIn: 300 }
  );
}

export async function downloadUrl(key: string) {
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }
  if (key.startsWith("/uploads/") || key.startsWith("/api/")) {
    return key;
  }
  // R2 custom public domain (e.g. https://agaate.krishnakr.com): stable public
  // URLs, no signing/expiry. Set S3_PUBLIC_BASE_URL to enable.
  const publicBase = process.env.S3_PUBLIC_BASE_URL?.replace(/\/$/, "");
  if (publicBase) {
    try {
      assertKey(key);
    } catch {
      return `/uploads/${key}`;
    }
    return `${publicBase}/${key}`;
  }
  const s3Endpoint = process.env.S3_ENDPOINT;
  const isDevPlaceholder =
    !s3Endpoint || process.env.S3_ACCESS_KEY_ID === "change-me";
  if (isDevPlaceholder) {
    return `/uploads/${key}`;
  }
  try {
    assertKey(key);
    return await getSignedUrl(
      client(),
      new GetObjectCommand({ Bucket: bucket(), Key: key }),
      { expiresIn: 3600 }
    );
  } catch {
    return `/uploads/${key}`;
  }
}

export async function headObject(key: string) {
  assertKey(key);
  return client().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
}

export async function putObject(key: string, body: Buffer | Uint8Array, mimeType: string) {
  assertKey(key);
  return client().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: key,
      Body: body as any,
      ContentType: mimeType,
    })
  );
}

export function isStorageConfigured() {
  const endpoint = process.env.S3_ENDPOINT;
  return (
    !!endpoint &&
    !!process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_ACCESS_KEY_ID !== "change-me" &&
    !!process.env.S3_SECRET_ACCESS_KEY
  );
}
