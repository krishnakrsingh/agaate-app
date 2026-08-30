import bcrypt from "bcryptjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
const schema=z.object({name:z.string().min(2).max(100).optional(),role:z.enum(["SUPER_ADMIN","FARM_ADMIN","AGRONOMIST","FARM_OFFICER"]).optional(),active:z.boolean().optional(),password:z.string().min(12).max(128).optional(),farmIds:z.array(z.string().min(1)).optional(),managesFarmIds:z.array(z.string().min(1)).optional()});
export async function PATCH(request:NextRequest,{params}:{params:Promise<{userId:string}>}){try{const actor=await currentActor();requireRole(actor.role,["SUPER_ADMIN"]);const {userId}=await params;const input=schema.parse(await request.json());const current=await prisma.user.findUniqueOrThrow({where:{id:userId},select:{role:true,active:true}});if(userId===actor.id&&(input.active===false||input.role&&input.role!=="SUPER_ADMIN"))throw new Error("You cannot remove your own Super Admin access.");if(current.role==="SUPER_ADMIN"&&((input.active===false)||(input.role&&input.role!=="SUPER_ADMIN"))){const remaining=await prisma.user.count({where:{role:"SUPER_ADMIN",active:true,id:{not:userId}}});if(!remaining)throw new Error("At least one active Super Admin is required.");}const ids=input.farmIds??[];const manage=(input.role??current.role)==="FARM_ADMIN"?(input.managesFarmIds??[]):[];const all=[...new Set([...ids,...manage])];if(all.length!==await prisma.farm.count({where:{id:{in:all}}}))throw new Error("A selected farm no longer exists.");const updated=await prisma.$transaction(async tx=>{
  let passwordHash: string | undefined;
  if (input.password) passwordHash = await bcrypt.hash(input.password, 12);
  if(input.farmIds||input.managesFarmIds){await tx.farmAccess.deleteMany({where:{userId}});if(all.length)await tx.farmAccess.createMany({data:all.map(farmId=>({userId,farmId,canManage:manage.includes(farmId)}))});}
  return tx.user.update({where:{id:userId},data:{name:input.name,role:input.role,active:input.active, ...(passwordHash?{passwordHash}:{})},include:{farmAccess:true}})
});await audit(actor.id,"UPDATE","User",userId,{role:updated.role,active:updated.active,farmIds:all});return NextResponse.json(updated);}catch(error){return apiError(error);}}
