import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs/promises";
import path from "path";

const ALLOWED_DIRECT_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_DIRECT_BYTES = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    // Direct disk/S3-buffered upload is a development-only fallback. In
    // production all uploads must use short-lived presigned URLs + complete.
    if (process.env.NODE_ENV === "production" || process.env.ALLOW_DIRECT_UPLOAD === "false") {
      return NextResponse.json({ error: "Uploads are temporarily unavailable." }, { status: 410 });
    }
    const { throttle } = await import("@/lib/rate-limit");
    const { getClientIp, assertSameOrigin } = await import("@/lib/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    const ipSlot = throttle(`upload-direct:${getClientIp(request.headers)}:${actor.id}`, 20, 60_000);
    if (!ipSlot.allowed) return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const farmId = (formData.get("farmId") as string) || "";
    const kind = (formData.get("kind") as string) || "SELFIE";

    if (!file || !farmId) {
      return NextResponse.json({ error: "File and farmId are required." }, { status: 400 });
    }
    if (!["SELFIE", "CROP_PHOTO", "INCIDENT_PHOTO", "ACTIVITY_EVIDENCE"].includes(kind)) {
      return NextResponse.json({ error: "A valid media kind is required." }, { status: 422 });
    }

    await requireFarmAccess(farmId);

    const mimeType = file.type || "image/jpeg";
    if (!ALLOWED_DIRECT_MIME.has(mimeType)) {
      return NextResponse.json({ error: "Uploaded file type does not match its metadata." }, { status: 422 });
    }
    if (typeof file.size === "number" && file.size > MAX_DIRECT_BYTES) {
      return NextResponse.json({ error: "Uploaded file is missing or exceeds the size limit." }, { status: 422 });
    }
    const extension = mimeType.split("/")[1] || "jpg";
    const dateStr = new Date().toISOString().slice(0, 10);
    const storageKey = `evidence/${farmId}/${dateStr}/${randomUUID()}.${extension}`;
    const bytes = await file.arrayBuffer();
    if (bytes.byteLength > MAX_DIRECT_BYTES) {
      return NextResponse.json({ error: "Uploaded file is missing or exceeds the size limit." }, { status: 422 });
    }
    const buffer = Buffer.from(bytes);

    let uploadedToS3 = false;
    const s3Endpoint = process.env.S3_ENDPOINT;
    const isDevPlaceholder = !s3Endpoint || process.env.S3_ACCESS_KEY_ID === "change-me" || s3Endpoint.includes("localhost:9000");
    if (!isDevPlaceholder && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY) {
      try {
        const s3 = new S3Client({
          endpoint: s3Endpoint,
          region: process.env.S3_REGION || "us-east-1",
          forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
          credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
          },
        });

        const uploadPromise = s3.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET || "agaate-evidence",
            Key: storageKey,
            Body: buffer,
            ContentType: mimeType,
          })
        );
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("S3 upload timeout")), 1500)
        );

        await Promise.race([uploadPromise, timeoutPromise]);
        uploadedToS3 = true;
      } catch (s3Err) {
        console.warn("[Upload] S3 upload skipped/failed, using local fallback:", s3Err);
      }
    }

    // Local filesystem storage fallback for local development only.
    // Never write under public/ in production (publicly servable auth bypass).
    if (!uploadedToS3) {
      const localDir = path.join(process.cwd(), "public", "uploads", "evidence", farmId, dateStr);
      await fs.mkdir(localDir, { recursive: true });
      const localFilePath = path.join(localDir, path.basename(storageKey));
      await fs.writeFile(localFilePath, buffer);
    }

    // Direct uploads are NOT auto-verified: caller must complete via S3 head check.
    // Mark unverified so selfies/evidence can't bypass the verify step.
    const media = await prisma.mediaAsset.create({
      data: {
        storageKey: uploadedToS3 ? storageKey : `evidence/${farmId}/${dateStr}/${path.basename(storageKey)}`,
        kind: kind as any,
        mimeType,
        sizeBytes: buffer.length,
        farmId,
        uploadedById: actor.id,
      },
    });

    await audit(actor.id, "COMPLETE_UPLOAD", "MediaAsset", media.id, {
      kind,
      sizeBytes: buffer.length,
      fallbackLocal: !uploadedToS3,
    });

    return NextResponse.json({
      mediaId: media.id,
      storageKey: media.storageKey,
      success: true,
    });
  } catch (error) {
    return apiError(error);
  }
}
