import "server-only";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const env=(key:string)=>{const value=process.env[key];if(!value)throw new Error(`${key} is not configured.`);return value;};
let cached: S3Client | null = null;
const client=()=>{
  if (cached) return cached;
  cached = new S3Client({endpoint:env("S3_ENDPOINT"),region:env("S3_REGION"),forcePathStyle:process.env.S3_FORCE_PATH_STYLE==="true",credentials:{accessKeyId:env("S3_ACCESS_KEY_ID"),secretAccessKey:env("S3_SECRET_ACCESS_KEY")}});
  return cached;
};
const bucket=()=>env("S3_BUCKET");
function assertKey(key:string){
  if (!key.startsWith("evidence/") || key.includes("..") || key.length > 512) throw new Error("Invalid storage key.");
}
export async function uploadUrl(key:string,mimeType:string){assertKey(key);return getSignedUrl(client(),new PutObjectCommand({Bucket:bucket(),Key:key,ContentType:mimeType}),{expiresIn:300});}
export async function downloadUrl(key: string) {
  if (key.startsWith("http://") || key.startsWith("https://")) {
    return key;
  }
  if (key.startsWith("/uploads/") || key.startsWith("/api/")) {
    return key;
  }
  const s3Endpoint = process.env.S3_ENDPOINT;
  const isDevPlaceholder = !s3Endpoint || process.env.S3_ACCESS_KEY_ID === "change-me" || s3Endpoint.includes("localhost:9000");
  if (isDevPlaceholder) {
    return `/uploads/${key}`;
  }
  try {
    assertKey(key);
    return await getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket(), Key: key }), { expiresIn: 3600 });
  } catch {
    return `/uploads/${key}`;
  }
}
export async function headObject(key:string){assertKey(key);return client().send(new HeadObjectCommand({Bucket:bucket(),Key:key}));}
