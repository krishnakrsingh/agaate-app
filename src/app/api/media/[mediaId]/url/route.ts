import { NextResponse } from "next/server";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { downloadUrl } from "@/lib/storage";
import { apiError } from "@/lib/api";
export async function GET(_:Request,{params}:{params:Promise<{mediaId:string}>}){try{const {mediaId}=await params;const media=await prisma.mediaAsset.findUniqueOrThrow({where:{id:mediaId}});if(!media.farmId||!media.verifiedAt)throw new Error("Media is not yet verified for access.");await requireFarmAccess(media.farmId);return NextResponse.json({url:await downloadUrl(media.storageKey),expiresInSeconds:300});}catch(error){return apiError(error);}}
