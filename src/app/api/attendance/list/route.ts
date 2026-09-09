import { NextRequest, NextResponse } from "next/server";
import { currentActor, accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, paginatedJson, paginationParams } from "@/lib/api";
export async function GET(request: NextRequest){try{const actor=await currentActor();if(!["SUPER_ADMIN","FARM_ADMIN"].includes(actor.role))throw new Error("Only administrators can view attendance.");const farm=await accessibleFarmWhere();const { limit, offset } = paginationParams(request.nextUrl.searchParams);const where={farm};const [rows, total]=await Promise.all([prisma.attendance.findMany({where,include:{user:{select:{name:true,email:true}},farm:{select:{id:true,name:true}},exception:true},orderBy:{attendanceDate:"desc"},take:limit,skip:offset}),prisma.attendance.count({where})]);return paginatedJson(rows, total);}catch(error){return apiError(error);}}
