import "server-only";
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
const env=(key:string)=>{const value=process.env[key];if(!value)throw new Error(`${key} is not configured.`);return value;};
const client=()=>new S3Client({endpoint:env("S3_ENDPOINT"),region:env("S3_REGION"),forcePathStyle:process.env.S3_FORCE_PATH_STYLE==="true",credentials:{accessKeyId:env("S3_ACCESS_KEY_ID"),secretAccessKey:env("S3_SECRET_ACCESS_KEY")}});
const bucket=()=>env("S3_BUCKET");
export async function uploadUrl(key:string,mimeType:string){return getSignedUrl(client(),new PutObjectCommand({Bucket:bucket(),Key:key,ContentType:mimeType}),{expiresIn:300});}
export async function downloadUrl(key:string){return getSignedUrl(client(),new GetObjectCommand({Bucket:bucket(),Key:key}),{expiresIn:300});}
export async function headObject(key:string){return client().send(new HeadObjectCommand({Bucket:bucket(),Key:key}));}
