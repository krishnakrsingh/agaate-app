import { NextResponse } from "next/server";
import { requireFarmAccess } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { downloadUrl } from "@infrastructure/storage";
import { apiError } from "@infrastructure/http";
export async function GET(_:Request,{params}:{params:Promise<{mediaId:string}>}){try{const {mediaId}=await params;const media=await prisma.mediaAsset.findUniqueOrThrow({where:{id:mediaId}});if(!media.farmId||!media.verifiedAt)throw new Error("Media is not yet verified for access.");await requireFarmAccess(media.farmId);return NextResponse.json({url:await downloadUrl(media.storageKey),expiresInSeconds:300});}catch(error){return apiError(error);}}
