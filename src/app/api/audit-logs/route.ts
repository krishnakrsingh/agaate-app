import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, paginationParams } from "@/lib/api";
export async function GET(request:NextRequest){try{const actor=await currentActor();requireRole(actor.role,["SUPER_ADMIN","FARM_ADMIN"]);const farmIdParam=request.nextUrl.searchParams.get("farmId");const farmId=farmIdParam?z.string().min(1).parse(farmIdParam):null;const { limit, offset } = paginationParams(request.nextUrl.searchParams);let where:Record<string,unknown>={};if(farmId){await requireFarmAccess(farmId);where={metadata:{path:["farmId"],equals:farmId}};}else if(actor.role!=="SUPER_ADMIN"){const farms=await prisma.farm.findMany({where:{access:{some:{userId:actor.id}}},select:{id:true}});if(!farms.length)return NextResponse.json([]);where={OR:farms.map(f=>({metadata:{path:["farmId"],equals:f.id}}))};}return NextResponse.json(await prisma.auditLog.findMany({where,include:{actor:{select:{name:true,email:true}}},orderBy:{createdAt:"desc"},take:limit,skip:offset}));}catch(error){return apiError(error);}}
