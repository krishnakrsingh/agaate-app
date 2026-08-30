import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, paginationParams } from "@/lib/api";
const schema=z.object({farmId:z.string().cuid(),proposedLatitude:z.coerce.number().gte(-90).lte(90),proposedLongitude:z.coerce.number().gte(-180).lte(180),reason:z.string().min(5).max(1000)});
export async function GET(request: NextRequest){try{const actor=await currentActor();if(!["SUPER_ADMIN","FARM_ADMIN"].includes(actor.role))throw new Error("Only administrators can view location change requests.");const where=actor.role==="SUPER_ADMIN"?{}:{farm:{access:{some:{userId:actor.id,canManage:true}}}};const { limit, offset } = paginationParams(request.nextUrl.searchParams);return NextResponse.json(await prisma.locationChangeRequest.findMany({where,include:{farm:{select:{id:true,name:true,location:true}}},orderBy:{createdAt:"desc"},take:limit,skip:offset}));}catch(error){return apiError(error);}}
export async function POST(request:NextRequest){try{const actor=await currentActor();const input=schema.parse(await request.json());await requireFarmAccess(input.farmId);const item=await prisma.locationChangeRequest.create({data:{...input,requesterId:actor.id}});await audit(actor.id,"CREATE","LocationChangeRequest",item.id,{farmId:input.farmId});return NextResponse.json(item,{status:201});}catch(error){return apiError(error);}}
