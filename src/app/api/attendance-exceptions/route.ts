import { NextRequest, NextResponse } from "next/server";
import { currentActor, accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, paginationParams } from "@/lib/api";
export async function GET(request: NextRequest){try{const actor=await currentActor();if(!["SUPER_ADMIN","FARM_ADMIN"].includes(actor.role))throw new Error("Only administrators can view attendance exceptions.");const farmWhere=await accessibleFarmWhere();const { limit, offset } = paginationParams(request.nextUrl.searchParams);return NextResponse.json(await prisma.attendanceException.findMany({where:{status:"PENDING",attendance:{farm:farmWhere}},include:{attendance:{include:{user:{select:{id:true,name:true,email:true}},farm:{select:{id:true,name:true}}}}},orderBy:{id:"desc"},take:limit,skip:offset}));}catch(error){return apiError(error);}}
