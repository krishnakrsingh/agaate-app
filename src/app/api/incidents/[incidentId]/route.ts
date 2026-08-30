import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
const schema=z.object({status:z.enum(["OPEN","ACKNOWLEDGED","RESOLVED","CLOSED"]).optional(),description:z.string().min(5).max(2000).optional(),severity:z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]).nullable().optional(),impactPercent:z.coerce.number().min(0).max(100).nullable().optional()});
export async function GET(_:NextRequest,{params}:{params:Promise<{incidentId:string}>}){try{const {incidentId}=await params;const actor=await currentActor();const item=await prisma.incident.findUniqueOrThrow({where:{id:incidentId},include:{media:true,reporter:{select:{name:true,email:true}},farm:{select:{id:true,name:true}},plot:{select:{name:true}},cropCycle:{select:{cropName:true}}}});await requireFarmAccess(item.farmId);return NextResponse.json(item);}catch(error){return apiError(error);}}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{incidentId:string}>}){try{const {incidentId}=await params;const actor=await currentActor();const item=await prisma.incident.findUniqueOrThrow({where:{id:incidentId}});if(actor.role==="FARM_ADMIN")await requireFarmAccess(item.farmId,true);else{requireRole(actor.role,["SUPER_ADMIN","AGRONOMIST"]);await requireFarmAccess(item.farmId);}const input=schema.parse(await request.json());const updated=await prisma.incident.update({where:{id:incidentId},data:input});await audit(actor.id,"UPDATE","Incident",incidentId,input);return NextResponse.json(updated);}catch(error){return apiError(error);}}
