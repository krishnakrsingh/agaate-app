import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole, HttpError } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { canTransitionTask } from "@/lib/business";
import { apiError } from "@/lib/api";
const schema=z.object({status:z.enum(["ASSIGNED","AVAILABLE","IN_PROGRESS","COMPLETED","CANCELLED","BLOCKED"]).optional(),title:z.string().min(3).max(160).optional(),description:z.string().min(3).max(2000).optional(),instructions:z.string().max(2000).nullable().optional(),priority:z.enum(["LOW","MEDIUM","HIGH","URGENT"]).optional(),dueDate:z.coerce.date().optional(),assignedOfficerId:z.string().min(1).nullable().optional(),plotId:z.string().min(1).nullable().optional(),cropCycleId:z.string().min(1).nullable().optional()});
export async function PATCH(request:NextRequest,{params}:{params:Promise<{taskId:string}>}) { try { const {taskId}=await params;const actor=await currentActor();const task=await prisma.task.findUniqueOrThrow({where:{id:taskId}});const input=schema.parse(await request.json());const planningFields = ["category", "priority", "dueDate", "assignedOfficerId", "plotId", "cropCycleId"];
const hasPlanningFields = Object.keys(input).some(k=>planningFields.includes(k));
await requireFarmAccess(task.farmId, hasPlanningFields && actor.role === "FARM_ADMIN");
if(actor.role==="FARM_OFFICER"){
  if(task.assignedOfficerId && task.assignedOfficerId!==actor.id) throw new HttpError(403,"This task is assigned to another officer.");
  if(hasPlanningFields) throw new HttpError(403,"Farm Officers cannot edit planned activity details.");
  if(input.status&&!['IN_PROGRESS','BLOCKED','CANCELLED'].includes(input.status)) throw new HttpError(403,"Farm Officers can only start, block, or cancel their assigned tasks.");
} else requireRole(actor.role,["SUPER_ADMIN","FARM_ADMIN","AGRONOMIST"]);
if(input.status==="COMPLETED") return NextResponse.json({error:"Use the execution completion endpoint to complete an activity."},{status:409});
if(actor.role==="FARM_OFFICER" && input.status && !canTransitionTask(task.status,input.status)) return NextResponse.json({error:`${input.status} is not a valid transition from ${task.status}.`},{status:409});
if(input.assignedOfficerId){
  const officer=await prisma.user.findUnique({where:{id:input.assignedOfficerId},select:{role:true,active:true,farmAccess:{where:{farmId:task.farmId}}}});
  if(!officer||officer.role!=="FARM_OFFICER"||!officer.active||!officer.farmAccess.length) throw new Error("The assigned user must be an active Farm Officer assigned to this farm.");
}
if(input.plotId&&!await prisma.plot.findFirst({where:{id:input.plotId,farmId:task.farmId,deletedAt:null}})) throw new Error("The selected plot is not part of this farm.");
if(input.cropCycleId&&!await prisma.cropCycle.findFirst({where:{id:input.cropCycleId,plot:{farmId:task.farmId,deletedAt:null},...(input.plotId?{plotId:input.plotId}:{})}})) throw new Error("The selected crop cycle is not part of this farm and plot.");
const {status,...fields}=input;
const result=await prisma.$transaction(async tx=>{
  const updated=await tx.task.update({
    where:{id:taskId},
    data:{
      ...fields,
      ...(status?{status}:{}),
      ...(!task.assignedOfficerId && actor.role === "FARM_OFFICER" ? { assignedOfficerId: actor.id } : {})
    }
  });
  if(status==="IN_PROGRESS") await tx.taskExecution.upsert({
    where:{taskId},
    update:{status,startedAt:new Date(),officerId:actor.id},
    create:{taskId,officerId:actor.id,status,startedAt:new Date()}
  });
  return updated;
});
await audit(actor.id,"UPDATE","Task",taskId,{from:task.status,to:status??task.status,fields:Object.keys(fields)});
return NextResponse.json(result);
}catch(error){return apiError(error);}}
