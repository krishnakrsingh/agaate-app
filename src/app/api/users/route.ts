import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, paginationParams } from "@/lib/api";
const createUserSchema = z.object({ name: z.string().min(2).max(100), email: z.string().email(), password: z.string().min(12).max(128), role: z.enum(["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"]), farmIds: z.array(z.string().cuid()).default([]), managesFarmIds: z.array(z.string().cuid()).default([]) });
export async function GET(request: NextRequest) { try { const actor = await currentActor(); requireRole(actor.role, ["SUPER_ADMIN"]); const { limit, offset } = paginationParams(request.nextUrl.searchParams); return NextResponse.json(await prisma.user.findMany({ select: { id:true,name:true,email:true,role:true,active:true,farmAccess:{ select:{farmId:true,canManage:true} } }, orderBy:{createdAt:"desc"}, take: limit, skip: offset })); } catch(error) { return apiError(error); } }
export async function POST(request: NextRequest) { try { const actor = await currentActor(); requireRole(actor.role, ["SUPER_ADMIN"]); const input = createUserSchema.parse(await request.json()); const farmIds = [...new Set([...input.farmIds, ...input.managesFarmIds])]; if (farmIds.length) { const count = await prisma.farm.count({where:{id:{in:farmIds}}}); if (count !== farmIds.length) throw new Error("A selected farm no longer exists."); }
  const user = await prisma.$transaction(async(tx) => tx.user.create({ data:{ name:input.name,email:input.email.toLowerCase(),passwordHash:await bcrypt.hash(input.password,12),role:input.role,farmAccess:{create:farmIds.map(farmId=>({farmId,canManage:input.role==="FARM_ADMIN"&&input.managesFarmIds.includes(farmId)}))} }, include:{farmAccess:true} }));
  await audit(actor.id,"CREATE","User",user.id,{ role:user.role, farmIds }); return NextResponse.json(user,{status:201});
} catch(error) { return apiError(error); } }
