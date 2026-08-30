import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { uploadUrl } from "@/lib/storage";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
const allowedMimeTypes=["image/jpeg","image/png","image/webp"];
const schema=z.object({farmId:z.string().min(1),kind:z.enum(["SELFIE","CROP_PHOTO","INCIDENT_PHOTO","ACTIVITY_EVIDENCE"]),mimeType:z.enum(["image/jpeg","image/png","image/webp"]),sizeBytes:z.coerce.number().int().positive().max(10*1024*1024)});
export async function POST(request:NextRequest){try{const actor=await currentActor();const input=schema.parse(await request.json());await requireFarmAccess(input.farmId);if(actor.role==="FARM_OFFICER"&&!input.kind)throw new Error("A valid media kind is required.");const extension=input.mimeType.split("/")[1];const key=`evidence/${input.farmId}/${new Date().toISOString().slice(0,10)}/${randomUUID()}.${extension}`;const media=await prisma.mediaAsset.create({data:{storageKey:key,kind:input.kind,mimeType:input.mimeType,sizeBytes:input.sizeBytes,farmId:input.farmId,uploadedById:actor.id}});await audit(actor.id,"PREPARE_UPLOAD","MediaAsset",media.id,{kind:input.kind,sizeBytes:input.sizeBytes});return NextResponse.json({mediaId:media.id,uploadUrl:await uploadUrl(key,input.mimeType),expiresInSeconds:300});}catch(error){return apiError(error);}}
