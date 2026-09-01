import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { testSessionContext } from "./auth";

import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as createFarmHandler } from "@/app/api/farms/route";
import { GET as getFarmHandler } from "@/app/api/farms/[farmId]/route";
import { POST as createPlotHandler } from "@/app/api/farms/[farmId]/plots/route";
import { POST as createCycleHandler } from "@/app/api/plots/[plotId]/crop-cycles/route";
import { POST as activateHandler } from "@/app/api/farms/[farmId]/activate/route";
import { POST as createTaskHandler, GET as listTasksHandler } from "@/app/api/tasks/route";
import { POST as generateDailyHandler } from "@/app/api/tasks/generate-daily/route";
import { PATCH as patchTaskHandler } from "@/app/api/tasks/[taskId]/route";
import { POST as completeTaskHandler } from "@/app/api/tasks/[taskId]/complete/route";
import { POST as attendanceHandler } from "@/app/api/attendance/route";
import { POST as presignHandler } from "@/app/api/uploads/presign/route";
import { POST as completeUploadHandler } from "@/app/api/uploads/[mediaId]/complete/route";
import { POST as monitoringHandler } from "@/app/api/monitoring/route";
import { POST as incidentHandler } from "@/app/api/incidents/route";
import { POST as followUpHandler } from "@/app/api/incidents/[incidentId]/follow-ups/route";
import { POST as locationReqHandler } from "@/app/api/location-change-requests/route";
import { PATCH as locationApproveHandler } from "@/app/api/location-change-requests/[requestId]/route";
import { PATCH as exceptionApproveHandler } from "@/app/api/attendance-exceptions/[exceptionId]/route";
import { GET as dashboardHandler } from "@/app/api/dashboard/route";
import { GET as reportHandler } from "@/app/api/reports/daily/route";
import { GET as auditHandler } from "@/app/api/audit-logs/route";

const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET || "local-development-session-secret-change-this-before-production-32chars");
async function tokenFor(u:any){ return await new SignJWT({userId:u.id, name:u.name, role:u.role}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("8h").sign(secret);}
function req(url:string, method:string, body:any, token?:string, headers?:Record<string,string>){
  const h = new Headers({"Content-Type":"application/json", ...(headers||{})});
  if(token) h.set("Cookie", `agaate_session=${token}`);
  return new NextRequest(url, {method, headers:h, body: body? JSON.stringify(body): undefined});
}

describe.sequential("Black-Box E2E Product Validation", ()=>{
  let superAdmin:any, farmAdmin:any, agronomist:any, officer:any;
  let superToken:string, faToken:string, agroToken:string, offToken:string;
  let farmId:string, plotId:string, cycleId:string, taskId:string, dailyTaskId:string;

  beforeAll(async ()=>{
    // Use seeded users
    superAdmin = await prisma.user.findUnique({where:{email:"admin@agaate.local"}});
    farmAdmin = await prisma.user.findUnique({where:{email:"farmadmin@agaate.local"}});
    agronomist = await prisma.user.findUnique({where:{email:"agronomist@agaate.local"}});
    officer = await prisma.user.findUnique({where:{email:"officer@agaate.local"}});
    if(!superAdmin || !farmAdmin || !agronomist || !officer) throw new Error("seed missing");
    superToken = await tokenFor(superAdmin);
    faToken = await tokenFor(farmAdmin);
    agroToken = await tokenFor(agronomist);
    offToken = await tokenFor(officer);
    // Cleanup old blackbox farm
    const oldFarms = await prisma.farm.findMany({where:{name:{startsWith:"BB Farm"}}, select:{id:true}});
    for(const f of oldFarms){
      await prisma.task.deleteMany({where:{farmId: f.id}});
      await prisma.agronomyPlan.deleteMany({where:{farmId: f.id}});
      await prisma.attendance.deleteMany({where:{farmId: f.id}});
      await prisma.incident.deleteMany({where:{farmId: f.id}});
      await prisma.cropMonitoring.deleteMany({where:{farmId: f.id}});
      await prisma.locationChangeRequest.deleteMany({where:{farmId: f.id}});
      await prisma.farmAccess.deleteMany({where:{farmId: f.id}});
      const plots = await prisma.plot.findMany({where:{farmId: f.id}, select:{id:true}});
      for(const p of plots){
        await prisma.cropCycle.deleteMany({where:{plotId: p.id}});
        await prisma.plot.deleteMany({where:{id: p.id}});
      }
      await prisma.farm.deleteMany({where:{id: f.id}});
    }
  });
  afterAll(async ()=>{
    if(farmId){
      await prisma.task.deleteMany({where:{farmId}});
      await prisma.agronomyPlan.deleteMany({where:{farmId}});
      await prisma.attendance.deleteMany({where:{farmId}});
      await prisma.incident.deleteMany({where:{farmId}});
      await prisma.cropMonitoring.deleteMany({where:{farmId}});
      await prisma.locationChangeRequest.deleteMany({where:{farmId}});
      await prisma.farmAccess.deleteMany({where:{farmId}});
      const plots = await prisma.plot.findMany({where:{farmId}, select:{id:true}});
      for(const p of plots){
        await prisma.cropCycle.deleteMany({where:{plotId: p.id}});
        await prisma.plot.deleteMany({where:{id: p.id}});
      }
      await prisma.farm.deleteMany({where:{id: farmId}});
    }
  });

  it("Workflow 1: SUPER_ADMIN creates farm → access → plot → crop → activation", async ()=>{
    // Actor: SUPER_ADMIN
    // Action: Create farm
    const farmBody = {name:`BB Farm ${Date.now()}`, ownerName:"BB Owner", location:"Hosur Test", latitude:12.5284, longitude:77.8341, totalArea:12, cultivableArea:10, waterSource:"Borewell", geofenceRadiusMeters:500};
    const farmReq = req("http://localhost:3000/api/farms","POST",farmBody, superToken);
    const farmRes = await testSessionContext.run({token: superToken}, ()=> createFarmHandler(farmReq as any));
    expect(farmRes.status).toBe(201);
    const farm:any = await farmRes.json(); farmId = farm.id;
    // DB verification
    const dbFarm = await prisma.farm.findUnique({where:{id: farmId}});
    expect(dbFarm?.name).toBe(farmBody.name);
    expect(dbFarm?.status).toBe("SETUP");
    // Verify audit
    const audit = await prisma.auditLog.findFirst({where:{entityId: farmId, action:"CREATE"}});
    expect(audit?.actorId).toBe(superAdmin.id);

    // Farm Access: SUPER_ADMIN already has implicit, but explicitly give FARM_ADMIN and OFFICER
    await prisma.farmAccess.upsert({where:{userId_farmId:{userId: farmAdmin.id, farmId}}, update:{canManage:true}, create:{userId: farmAdmin.id, farmId, canManage:true}});
    await prisma.farmAccess.upsert({where:{userId_farmId:{userId: officer.id, farmId}}, update:{canManage:false}, create:{userId: officer.id, farmId, canManage:false}});
    await prisma.farmAccess.upsert({where:{userId_farmId:{userId: agronomist.id, farmId}}, update:{canManage:false}, create:{userId: agronomist.id, farmId, canManage:false}});
    const access = await prisma.farmAccess.findMany({where:{farmId}});
    expect(access.length).toBeGreaterThanOrEqual(3);

    // Plot
    const plotBody = {name:"BB Plot A", area:4, latitude:12.5286, longitude:77.8343, soilType:"Red Loam", irrigation:[{type:"Drip", details:"2LPH"}, {type:"Sprinkler"}]};
    const plotReq = req(`http://localhost:3000/api/farms/${farmId}/plots`,"POST",plotBody, faToken);
    const plotRes = await testSessionContext.run({token: faToken}, ()=> createPlotHandler(plotReq as any, {params: Promise.resolve({farmId})} as any));
    expect(plotRes.status).toBe(201);
    const plot:any = await plotRes.json(); plotId = plot.id;
    const dbPlot = await prisma.plot.findUnique({where:{id: plotId}, include:{irrigation:true}});
    expect(dbPlot?.irrigation.length).toBe(2);
    expect(Number(dbPlot?.area)).toBe(4);

    // Crop Cycle with varieties and milestones
    const today = new Date(); const harvest = new Date(today); harvest.setDate(harvest.getDate()+60);
    const cycleBody = {
      cropName:"Watermelon BB", startDate: today.toISOString(), expectedFirstHarvestDate: harvest.toISOString(),
      establishmentType:"NURSERY_TRANSPLANTATION", varieties:["Arka Manik","Black Magic"], bedPreparationEnabled:true, bedWidthCm:90, bedCenterDistanceCm:150, expectedBedsPerAcre:200, mulchEnabled:true, mulchHolePattern:"DOUBLE_LINE_ZIGZAG", plantDistanceCm:45, expectedPlantsPerAcre:6000,
      milestones:[
        {name:"Land Preparation", targetDate: today.toISOString()},
        {name:"Mulching & TP / Sowing Readiness", targetDate: today.toISOString()},
        {name:"Transplantation", targetDate: today.toISOString()},
        {name:"First Harvest", targetDate: harvest.toISOString()}
      ],
      supportActivities:[{name:"Trellising", targetDate: harvest.toISOString()}]
    };
    const cycleReq = req(`http://localhost:3000/api/plots/${plotId}/crop-cycles`,"POST",cycleBody, faToken);
    const cycleRes = await testSessionContext.run({token: faToken}, ()=> createCycleHandler(cycleReq as any, {params: Promise.resolve({plotId})} as any));
    expect(cycleRes.status).toBe(201);
    const cycle:any = await cycleRes.json(); cycleId = cycle.id;
    const dbCycle = await prisma.cropCycle.findUnique({where:{id: cycleId}, include:{varieties:true, milestones:true}});
    expect(dbCycle?.varieties.length).toBe(2);
    expect(dbCycle?.milestones.length).toBe(5); // 4 + 1 support
    expect(dbCycle?.expectedTotalBeds?.toString()).toBe((4*200).toString()); // 800

    // Activation
    const actReq = req(`http://localhost:3000/api/farms/${farmId}/activate`,"POST",{}, faToken);
    const actRes = await testSessionContext.run({token: faToken}, ()=> activateHandler({} as any, {params: Promise.resolve({farmId})} as any));
    expect(actRes.status).toBe(200);
    const dbFarmActive = await prisma.farm.findUnique({where:{id: farmId}});
    expect(dbFarmActive?.status).toBe("ACTIVE");
    const dbPlotActive = await prisma.plot.findUnique({where:{id: plotId}});
    expect(dbPlotActive?.status).toBe("ACTIVE");
    const dbCycleActive = await prisma.cropCycle.findUnique({where:{id: cycleId}});
    expect(dbCycleActive?.status).toBe("ACTIVE");
    // Verify system tasks created for milestones (4+1 =5)
    const systemTasks = await prisma.task.findMany({where:{farmId, origin:"SYSTEM"}});
    expect(systemTasks.length).toBe(5);

    // Refresh via GET farm
    const getReq = req(`http://localhost:3000/api/farms/${farmId}`,"GET",null, superToken);
    const getRes = await testSessionContext.run({token: superToken}, ()=> getFarmHandler(getReq as any, {params: Promise.resolve({farmId})} as any));
    expect(getRes.status).toBe(200);
    const getFarm:any = await getRes.json();
    expect(getFarm.plots.length).toBe(1);
    expect(getFarm.plots[0].cropCycles[0].cropName).toBe("Watermelon BB");
  });

  it("Workflow 2: AGRONOMIST creates agronomy work, generates daily, inspects", async ()=>{
    // Agronomist creates task within 7-day window
    const dateStr = new Date().toISOString().slice(0,10);
    const taskBody = {farmId, plotId, cropCycleId: cycleId, date: dateStr, category:"FERTIGATION", title:"BB Fertigation", description:"Inject MAP 4kg/acre", priority:"HIGH", assignedOfficerId: officer.id};
    const taskReq = req("http://localhost:3000/api/tasks","POST",taskBody, agroToken);
    const taskRes = await testSessionContext.run({token: agroToken}, ()=> createTaskHandler(taskReq as any));
    expect(taskRes.status).toBe(201);
    const task:any = await taskRes.json(); taskId = task.id;
    expect(task.assignedOfficerId).toBe(officer.id);
    expect(task.origin).toBe("AGRONOMIST");

    // Generate daily tasks (officer)
    const genReq = req("http://localhost:3000/api/tasks/generate-daily","POST",{farmId, date: dateStr}, offToken);
    const genRes = await testSessionContext.run({token: offToken}, ()=> generateDailyHandler(genReq as any));
    expect(genRes.status).toBe(200);
    const gen:any = await genRes.json();
    expect(gen.generated).toBeGreaterThanOrEqual(1);
    // Verify task belongs to officer
    const dailyTask = await prisma.task.findFirst({where:{origin:"DAILY_MONITORING", cropCycleId: cycleId, assignedOfficerId: officer.id}});
    expect(dailyTask).toBeDefined();
    dailyTaskId = dailyTask!.id;

    // List tasks as agronomist (should see all)
    const listReq = req(`http://localhost:3000/api/tasks?farmId=${farmId}`,"GET",null, agroToken);
    const listRes = await testSessionContext.run({token: agroToken}, ()=> listTasksHandler(listReq as any));
    expect(listRes.status).toBe(200);
    const tasks:any = await listRes.json();
    expect(tasks.some((t:any)=>t.id===taskId)).toBe(true);

    // Agronomist tries to mutate farm (should 403)
    const patchFarmReq = req(`http://localhost:3000/api/farms/${farmId}`,"PATCH",{name:"Hacked"}, agroToken);
    const { PATCH: patchFarm } = await import("@/app/api/farms/[farmId]/route");
    const patchRes = await testSessionContext.run({token: agroToken}, ()=> patchFarm(patchFarmReq as any, {params: Promise.resolve({farmId})} as any));
    expect(patchRes.status).toBe(403);

    // Dashboard/report
    const dashReq = req("http://localhost:3000/api/dashboard?farmId="+farmId,"GET",null, agroToken);
    const dashRes = await testSessionContext.run({token: agroToken}, ()=> dashboardHandler(dashReq as any));
    expect(dashRes.status).toBe(200);
    const dash:any = await dashRes.json();
    expect(dash.activeFarms).toBeGreaterThanOrEqual(1);
    const reportReq = req(`http://localhost:3000/api/reports/daily?farmId=${farmId}`,"GET",null, agroToken);
    const reportRes = await testSessionContext.run({token: agroToken}, ()=> reportHandler(reportReq as any));
    expect(reportRes.status).toBe(200);
  });

  it("Workflow 3: FARM_OFFICER field workflow", async ()=>{
    // Login already via token, generate daily already done
    // START attendance inside geofence with selfie
    // Need verified selfie media
    const presignReq = req("http://localhost:3000/api/uploads/presign","POST",{farmId, kind:"SELFIE", mimeType:"image/jpeg", sizeBytes:500}, offToken);
    const presignRes = await testSessionContext.run({token: offToken}, ()=> presignHandler(presignReq as any));
    const presign:any = await presignRes.json();
    // Simulate S3 PUT
    await fetch(presign.uploadUrl, {method:"PUT", headers:{"Content-Type":"image/jpeg"}, body: Buffer.from("a".repeat(500))});
    const completeReq = req(`http://localhost:3000/api/uploads/${presign.mediaId}/complete`,"POST",{}, offToken);
    await testSessionContext.run({token: offToken}, ()=> completeUploadHandler(completeReq as any, {params: Promise.resolve({mediaId: presign.mediaId})} as any));
    const selfieId = presign.mediaId;

    const startReq = req("http://localhost:3000/api/attendance","POST",{farmId, action:"START", latitude:12.5284, longitude:77.8341, selfieMediaId: selfieId}, offToken);
    const startRes = await testSessionContext.run({token: offToken}, ()=> attendanceHandler(startReq as any));
    expect(startRes.status).toBe(200);
    const startBody:any = await startRes.json();
    expect(startBody.withinGeofence).toBe(true);
    const dbAtt = await prisma.attendance.findFirst({where:{userId: officer.id, farmId, attendanceDate: new Date(new Date().toISOString().slice(0,10))}});
    expect(dbAtt?.status).toBe("OPEN");

    // Complete agronomy task: first start
    const startTaskReq = req(`http://localhost:3000/api/tasks/${taskId}`,"PATCH",{status:"IN_PROGRESS"}, offToken);
    const startTaskRes = await testSessionContext.run({token: offToken}, ()=> patchTaskHandler(startTaskReq as any, {params: Promise.resolve({taskId})} as any));
    expect(startTaskRes.status).toBe(200);
    // Upload evidence
    const evPresign = req("http://localhost:3000/api/uploads/presign","POST",{farmId, kind:"ACTIVITY_EVIDENCE", mimeType:"image/jpeg", sizeBytes:400}, offToken);
    const evPresignRes = await testSessionContext.run({token: offToken}, ()=> presignHandler(evPresign as any));
    const evPresignData:any = await evPresignRes.json();
    await fetch(evPresignData.uploadUrl, {method:"PUT", headers:{"Content-Type":"image/jpeg"}, body: Buffer.from("b".repeat(400))});
    await testSessionContext.run({token: offToken}, ()=> completeUploadHandler(req(`http://localhost:3000/api/uploads/${evPresignData.mediaId}/complete`,"POST",{}, offToken) as any, {params: Promise.resolve({mediaId: evPresignData.mediaId})} as any));
    const completeReq2 = req(`http://localhost:3000/api/tasks/${taskId}/complete`,"POST",{remarks:"Completed fertigation", mediaIds:[evPresignData.mediaId], materials:[{materialName:"MAP", quantity:4, unit:"kg"}], labour:[{labourers:2, hours:3}]}, offToken);
    const completeRes = await testSessionContext.run({token: offToken}, ()=> completeTaskHandler(completeReq2 as any, {params: Promise.resolve({taskId})} as any));
    expect(completeRes.status).toBe(200);
    const dbTask = await prisma.task.findUnique({where:{id: taskId}});
    expect(dbTask?.status).toBe("COMPLETED");
    const exec = await prisma.taskExecution.findUnique({where:{taskId}, include:{materials:true, labour:true, media:true}});
    expect(exec?.materials.length).toBe(1);
    expect(Number(exec?.labour[0].labourHours)).toBe(6);
    expect(exec?.media.length).toBe(1);
    // Verify refresh: GET task list shows completed
    const listAfter = await testSessionContext.run({token: offToken}, ()=> listTasksHandler(req(`http://localhost:3000/api/tasks?farmId=${farmId}`,"GET",null, offToken) as any));
    const listAfterJson:any = await listAfter.json();
    expect(listAfterJson.find((t:any)=>t.id===taskId).status).toBe("COMPLETED");

    // Crop monitoring for daily task - should auto-complete daily monitoring task
    const monPresign = req("http://localhost:3000/api/uploads/presign","POST",{farmId, kind:"CROP_PHOTO", mimeType:"image/jpeg", sizeBytes:300}, offToken);
    const monPresignRes = await testSessionContext.run({token: offToken}, ()=> presignHandler(monPresign as any));
    const monPresignData:any = await monPresignRes.json();
    await fetch(monPresignData.uploadUrl, {method:"PUT", headers:{"Content-Type":"image/jpeg"}, body: Buffer.from("c".repeat(300))});
    await testSessionContext.run({token: offToken}, ()=> completeUploadHandler(req(`http://localhost:3000/api/uploads/${monPresignData.mediaId}/complete`,"POST",{}, offToken) as any, {params: Promise.resolve({mediaId: monPresignData.mediaId})} as any));
    const monReq = req("http://localhost:3000/api/monitoring","POST",{farmId, plotId, cropCycleId: cycleId, status:"GOOD", stage:"Vegetative", mediaIds:[monPresignData.mediaId]}, offToken);
    const monRes = await testSessionContext.run({token: offToken}, ()=> monitoringHandler(monReq as any));
    expect(monRes.status).toBe(201);
    const dbDaily = await prisma.task.findUnique({where:{id: dailyTaskId}});
    expect(dbDaily?.status).toBe("COMPLETED"); // auto-completed
    expect(dbDaily?.assignedOfficerId).toBe(officer.id); // remains correct officer

    // Incident creation
    const incPresign = req("http://localhost:3000/api/uploads/presign","POST",{farmId, kind:"INCIDENT_PHOTO", mimeType:"image/jpeg", sizeBytes:200}, offToken);
    const incPresignRes = await testSessionContext.run({token: offToken}, ()=> presignHandler(incPresign as any));
    const incPresignData:any = await incPresignRes.json();
    await fetch(incPresignData.uploadUrl, {method:"PUT", headers:{"Content-Type":"image/jpeg"}, body: Buffer.from("d".repeat(200))});
    await testSessionContext.run({token: offToken}, ()=> completeUploadHandler(req(`http://localhost:3000/api/uploads/${incPresignData.mediaId}/complete`,"POST",{}, offToken) as any, {params: Promise.resolve({mediaId: incPresignData.mediaId})} as any));
    const incReq = req("http://localhost:3000/api/incidents","POST",{farmId, plotId, cropCycleId: cycleId, level:"CROP", type:"Pest Damage", description:"Aphids observed", mediaIds:[incPresignData.mediaId]}, offToken);
    const incRes = await testSessionContext.run({token: offToken}, ()=> incidentHandler(incReq as any));
    expect(incRes.status).toBe(201);
    const incident:any = await incRes.json();
    const dbInc = await prisma.incident.findUnique({where:{id: incident.id}});
    expect(dbInc?.level).toBe("CROP");
    // Follow-up (as agronomist)
    const fuReq = req(`http://localhost:3000/api/incidents/${incident.id}/follow-ups`,"POST",{action:"ACKNOWLEDGED", remarks:"Will spray neem"}, agroToken);
    const fuRes = await testSessionContext.run({token: agroToken}, ()=> followUpHandler(fuReq as any, {params: Promise.resolve({incidentId: incident.id})} as any));
    // Follow-up handler may be 201 or 200 depending on impl, just check not 500
    expect([200,201].includes(fuRes.status)).toBe(true);

    // END attendance
    const endPresign = req("http://localhost:3000/api/uploads/presign","POST",{farmId, kind:"SELFIE", mimeType:"image/jpeg", sizeBytes:500}, offToken);
    const endPresignRes = await testSessionContext.run({token: offToken}, ()=> presignHandler(endPresign as any));
    const endPresignData:any = await endPresignRes.json();
    await fetch(endPresignData.uploadUrl, {method:"PUT", headers:{"Content-Type":"image/jpeg"}, body: Buffer.from("e".repeat(500))});
    await testSessionContext.run({token: offToken}, ()=> completeUploadHandler(req(`http://localhost:3000/api/uploads/${endPresignData.mediaId}/complete`,"POST",{}, offToken) as any, {params: Promise.resolve({mediaId: endPresignData.mediaId})} as any));
    const endReq = req("http://localhost:3000/api/attendance","POST",{farmId, action:"END", latitude:12.5284, longitude:77.8341, selfieMediaId: endPresignData.mediaId}, offToken);
    const endRes = await testSessionContext.run({token: offToken}, ()=> attendanceHandler(endReq as any));
    expect(endRes.status).toBe(200);
    const dbAttEnd = await prisma.attendance.findFirst({where:{userId: officer.id, farmId}});
    expect(dbAttEnd?.status).toBe("COMPLETED");
    expect(dbAttEnd?.endAt).toBeDefined();
  });

  it("Workflow 4: FARM_ADMIN reviews", async ()=>{
    // Create an attendance exception via outside geofence
    await prisma.attendance.deleteMany({where:{userId: officer.id, farmId}});
    const presign = req("http://localhost:3000/api/uploads/presign","POST",{farmId, kind:"SELFIE", mimeType:"image/jpeg", sizeBytes:400}, offToken);
    const presignRes = await testSessionContext.run({token: offToken}, ()=> presignHandler(presign as any));
    const presignData:any = await presignRes.json();
    await fetch(presignData.uploadUrl, {method:"PUT", headers:{"Content-Type":"image/jpeg"}, body: Buffer.from("f".repeat(400))});
    await testSessionContext.run({token: offToken}, ()=> completeUploadHandler(req(`http://localhost:3000/api/uploads/${presignData.mediaId}/complete`,"POST",{}, offToken) as any, {params: Promise.resolve({mediaId: presignData.mediaId})} as any));
    const outsideReq = req("http://localhost:3000/api/attendance","POST",{farmId, action:"START", latitude:12.6, longitude:77.9, selfieMediaId: presignData.mediaId, reason:"Remote field visit"}, offToken);
    const outsideRes = await testSessionContext.run({token: offToken}, ()=> attendanceHandler(outsideReq as any));
    expect(outsideRes.status).toBe(200);
    const att:any = await outsideRes.json();
    expect(att.attendance.status).toBe("EXCEPTION_PENDING");
    // Find exception
    const exc = await prisma.attendanceException.findFirst({where:{attendanceId: att.attendance.id}});
    expect(exc?.status).toBe("PENDING");
    // Approve as FARM_ADMIN
    const approveReq = req(`http://localhost:3000/api/attendance-exceptions/${exc!.id}`,"PATCH",{status:"APPROVED"}, faToken);
    const approveRes = await testSessionContext.run({token: faToken}, ()=> exceptionApproveHandler(approveReq as any, {params: Promise.resolve({exceptionId: exc!.id})} as any));
    expect(approveRes.status).toBe(200);
    const dbExc = await prisma.attendanceException.findUnique({where:{id: exc!.id}});
    expect(dbExc?.status).toBe("APPROVED");
    const dbAtt = await prisma.attendance.findUnique({where:{id: att.attendance.id}});
    expect(dbAtt?.status).toBe("EXCEPTION_APPROVED");
    // Cleanup
    await prisma.attendance.deleteMany({where:{userId: officer.id, farmId}});

    // Location change review
    const locReq = req("http://localhost:3000/api/location-change-requests","POST",{farmId, proposedLatitude:12.6, proposedLongitude:77.91, reason:"Corrected GPS after survey with extra detail"}, offToken);
    const locRes = await testSessionContext.run({token: offToken}, ()=> locationReqHandler(locReq as any));
    expect(locRes.status).toBe(201);
    const loc:any = await locRes.json();
    const locApprove = req(`http://localhost:3000/api/location-change-requests/${loc.id}`,"PATCH",{status:"APPROVED"}, faToken);
    const locApproveRes = await testSessionContext.run({token: faToken}, ()=> locationApproveHandler(locApprove as any, {params: Promise.resolve({requestId: loc.id})} as any));
    expect(locApproveRes.status).toBe(200);
    const dbFarm = await prisma.farm.findUnique({where:{id: farmId}});
    expect(Number(dbFarm?.latitude)).toBeCloseTo(12.6,4);
    // Revert
    await prisma.farm.update({where:{id: farmId}, data:{latitude:12.5284, longitude:77.8341}});
    await prisma.locationChangeRequest.deleteMany({where:{id: loc.id}});

    // Audit logs
    const auditReq = req(`http://localhost:3000/api/audit-logs?farmId=${farmId}`,"GET",null, faToken);
    const auditRes = await testSessionContext.run({token: faToken}, ()=> auditHandler(auditReq as any));
    expect(auditRes.status).toBe(200);
    const audits:any = await auditRes.json();
    expect(audits.length).toBeGreaterThan(0);
    expect(audits[0].actor).toBeDefined();
  });

  it("Workflow 5: Negative journeys", async ()=>{
    // Wrong farm: officer tries to create plot in farm not assigned (use farmId that doesn't exist or not accessible)
    // Create a farm via superAdmin not accessible to officer, then officer tries plot
    const fakeFarmId = "cm_fake_id_123";
    const badPlotReq = req(`http://localhost:3000/api/farms/${fakeFarmId}/plots`,"POST",{name:"Hack", area:1, latitude:12, longitude:77, irrigation:[{type:"Drip"}]}, offToken);
    const badPlotRes = await testSessionContext.run({token: offToken}, ()=> createPlotHandler(badPlotReq as any, {params: Promise.resolve({farmId: fakeFarmId})} as any));
    expect([403,404,422].includes(badPlotRes.status)).toBe(true);

    // Invalid input: plot area 0
    const badPlot2 = req(`http://localhost:3000/api/farms/${farmId}/plots`,"POST",{name:"Bad", area:0, latitude:12, longitude:77, irrigation:[{type:"Drip"}]}, faToken);
    const badPlotRes2 = await testSessionContext.run({token: faToken}, ()=> createPlotHandler(badPlot2 as any, {params: Promise.resolve({farmId})} as any));
    expect(badPlotRes2.status).toBe(422);

    // Duplicate plot name
    const dupPlot = req(`http://localhost:3000/api/farms/${farmId}/plots`,"POST",{name:"BB Plot A", area:1, latitude:12, longitude:77, irrigation:[{type:"Drip"}]}, faToken);
    const dupRes = await testSessionContext.run({token: faToken}, ()=> createPlotHandler(dupPlot as any, {params: Promise.resolve({farmId})} as any));
    expect(dupRes.status).toBe(409);

    // Repeated completion
    const dateStr = new Date().toISOString().slice(0,10);
    const tReq = req("http://localhost:3000/api/tasks","POST",{farmId, plotId, cropCycleId: cycleId, date: dateStr, category:"CULTURAL_PRACTICE", title:"Negative Test", description:"test", priority:"LOW", assignedOfficerId: officer.id}, agroToken);
    const tRes = await testSessionContext.run({token: agroToken}, ()=> createTaskHandler(tReq as any));
    const t:any = await tRes.json();
    const sReq = req(`http://localhost:3000/api/tasks/${t.id}`,"PATCH",{status:"IN_PROGRESS"}, offToken);
    await testSessionContext.run({token: offToken}, ()=> patchTaskHandler(sReq as any, {params: Promise.resolve({taskId: t.id})} as any));
    const cReq = req(`http://localhost:3000/api/tasks/${t.id}/complete`,"POST",{remarks:"done"}, offToken);
    const cRes = await testSessionContext.run({token: offToken}, ()=> completeTaskHandler(cReq as any, {params: Promise.resolve({taskId: t.id})} as any));
    expect(cRes.status).toBe(200);
    const cDup = req(`http://localhost:3000/api/tasks/${t.id}/complete`,"POST",{remarks:"again"}, offToken);
    const cDupRes = await testSessionContext.run({token: offToken}, ()=> completeTaskHandler(cDup as any, {params: Promise.resolve({taskId: t.id})} as any));
    expect(cDupRes.status).toBe(409);
    await prisma.task.deleteMany({where:{id: t.id}});

    // Invalid media: use officer's media but for wrong farm
    // Already tested in adversarial, just verify 422
    const badMedia = await prisma.mediaAsset.create({data:{storageKey:`evidence/${farmId}/bad-${Date.now()}.jpg`, kind:"SELFIE", mimeType:"image/jpeg", sizeBytes:100, farmId, uploadedById: officer.id, verifiedAt: new Date()}});
    const badAtt = req("http://localhost:3000/api/attendance","POST",{farmId, action:"START", latitude:12.6, longitude:77.9, selfieMediaId: badMedia.id, reason:"x".repeat(2)}, offToken);
    // reason too short should 422 (min 5)
    const badAttRes = await testSessionContext.run({token: offToken}, ()=> attendanceHandler(badAtt as any));
    expect(badAttRes.status).toBe(422);
    await prisma.mediaAsset.deleteMany({where:{id: badMedia.id}});
    await prisma.attendance.deleteMany({where:{userId: officer.id, farmId}});

    // Expired session: use expired token
    const expired = await new SignJWT({userId: officer.id, name: officer.name, role: officer.role}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("-1h").sign(secret);
    const expReq = req(`http://localhost:3000/api/farms/${farmId}`,"GET",null, expired);
    const { GET: getFarm } = await import("@/app/api/farms/[farmId]/route");
    const expRes = await testSessionContext.run({token: expired}, ()=> getFarm(expReq as any, {params: Promise.resolve({farmId})} as any));
    expect(expRes.status).toBe(401);

    // Direct protected route without auth
    const noAuthReq = req(`http://localhost:3000/api/farms/${farmId}`,"GET",null);
    const noAuthRes = await getFarm(noAuthReq as any, {params: Promise.resolve({farmId})} as any);
    expect(noAuthRes.status).toBe(401);
  });

  it("Workflow 6: Fresh DB minimal journey", async ()=>{
    // This workflow uses the same DB but creates a new isolated farm with unique name
    const freshFarmName = `Fresh Farm ${Date.now()}`;
    const createReq = req("http://localhost:3000/api/farms","POST",{name: freshFarmName, ownerName:"Fresh Owner", location:"Fresh Loc", latitude:12.3, longitude:77.3, totalArea:5, cultivableArea:4, waterSource:"Well"}, superToken);
    const createRes = await testSessionContext.run({token: superToken}, ()=> createFarmHandler(createReq as any));
    expect(createRes.status).toBe(201);
    const freshFarm:any = await createRes.json();
    const freshFarmId = freshFarm.id;
    await prisma.farmAccess.create({data:{userId: farmAdmin.id, farmId: freshFarmId, canManage:true}});
    await prisma.farmAccess.create({data:{userId: officer.id, farmId: freshFarmId, canManage:false}});
    // Plot
    const plotReq = req(`http://localhost:3000/api/farms/${freshFarmId}/plots`,"POST",{name:"Fresh Plot", area:2, latitude:12.3, longitude:77.3, irrigation:[{type:"Drip"}]}, faToken);
    const plotRes = await testSessionContext.run({token: faToken}, ()=> createPlotHandler(plotReq as any, {params: Promise.resolve({farmId: freshFarmId})} as any));
    expect(plotRes.status).toBe(201);
    const freshPlot:any = await plotRes.json();
    // Crop
    const today = new Date(); const harvest = new Date(today); harvest.setDate(harvest.getDate()+30);
    const cycleReq = req(`http://localhost:3000/api/plots/${freshPlot.id}/crop-cycles`,"POST",{cropName:"Fresh Crop", startDate: today.toISOString(), establishmentType:"DIRECT_SOWING", varieties:["V1"], bedPreparationEnabled:false, mulchEnabled:false, milestones:[{name:"Land Preparation", targetDate: today.toISOString()}, {name:"TP / Sowing Readiness", targetDate: today.toISOString()}, {name:"Direct Sowing", targetDate: today.toISOString()}, {name:"First Harvest", targetDate: harvest.toISOString()}]}, faToken);
    const cycleRes = await testSessionContext.run({token: faToken}, ()=> createCycleHandler(cycleReq as any, {params: Promise.resolve({plotId: freshPlot.id})} as any));
    expect(cycleRes.status).toBe(201);
    const freshCycle:any = await cycleRes.json();
    // Activate
    const actRes = await testSessionContext.run({token: faToken}, ()=> activateHandler({} as any, {params: Promise.resolve({farmId: freshFarmId})} as any));
    expect(actRes.status).toBe(200);
    // Officer attendance
    const presign = req("http://localhost:3000/api/uploads/presign","POST",{farmId: freshFarmId, kind:"SELFIE", mimeType:"image/jpeg", sizeBytes:200}, offToken);
    const presignRes = await testSessionContext.run({token: offToken}, ()=> presignHandler(presign as any));
    const presignData:any = await presignRes.json();
    await fetch(presignData.uploadUrl, {method:"PUT", headers:{"Content-Type":"image/jpeg"}, body: Buffer.from("x".repeat(200))});
    await testSessionContext.run({token: offToken}, ()=> completeUploadHandler(req(`http://localhost:3000/api/uploads/${presignData.mediaId}/complete`,"POST",{}, offToken) as any, {params: Promise.resolve({mediaId: presignData.mediaId})} as any));
    const attReq = req("http://localhost:3000/api/attendance","POST",{farmId: freshFarmId, action:"START", latitude:12.3, longitude:77.3, selfieMediaId: presignData.mediaId}, offToken);
    const attRes = await testSessionContext.run({token: offToken}, ()=> attendanceHandler(attReq as any));
    expect(attRes.status).toBe(200);
    // Task via agronomist
    const dateStr = new Date().toISOString().slice(0,10);
    const taskReq = req("http://localhost:3000/api/tasks","POST",{farmId: freshFarmId, plotId: freshPlot.id, cropCycleId: freshCycle.id, date: dateStr, category:"PEST_CONTROL", title:"Fresh Task", description:"Spray", priority:"MEDIUM", assignedOfficerId: officer.id}, agroToken);
    const taskRes = await testSessionContext.run({token: agroToken}, ()=> createTaskHandler(taskReq as any));
    expect(taskRes.status).toBe(201);
    const task:any = await taskRes.json();
    // Complete task
    const startReq = req(`http://localhost:3000/api/tasks/${task.id}`,"PATCH",{status:"IN_PROGRESS"}, offToken);
    await testSessionContext.run({token: offToken}, ()=> patchTaskHandler(startReq as any, {params: Promise.resolve({taskId: task.id})} as any));
    const compReq = req(`http://localhost:3000/api/tasks/${task.id}/complete`,"POST",{remarks:"done fresh"}, offToken);
    const compRes = await testSessionContext.run({token: offToken}, ()=> completeTaskHandler(compReq as any, {params: Promise.resolve({taskId: task.id})} as any));
    expect(compRes.status).toBe(200);
    // Monitoring
    const monPresign = req("http://localhost:3000/api/uploads/presign","POST",{farmId: freshFarmId, kind:"CROP_PHOTO", mimeType:"image/jpeg", sizeBytes:200}, offToken);
    const monPresignRes = await testSessionContext.run({token: offToken}, ()=> presignHandler(monPresign as any));
    const monPresignData:any = await monPresignRes.json();
    await fetch(monPresignData.uploadUrl, {method:"PUT", headers:{"Content-Type":"image/jpeg"}, body: Buffer.from("y".repeat(200))});
    await testSessionContext.run({token: offToken}, ()=> completeUploadHandler(req(`http://localhost:3000/api/uploads/${monPresignData.mediaId}/complete`,"POST",{}, offToken) as any, {params: Promise.resolve({mediaId: monPresignData.mediaId})} as any));
    const monReq = req("http://localhost:3000/api/monitoring","POST",{farmId: freshFarmId, plotId: freshPlot.id, cropCycleId: freshCycle.id, status:"GOOD", stage:"Vegetative", mediaIds:[monPresignData.mediaId]}, offToken);
    const monRes = await testSessionContext.run({token: offToken}, ()=> monitoringHandler(monReq as any));
    expect(monRes.status).toBe(201);
    // Report
    const reportReq = req(`http://localhost:3000/api/reports/daily?farmId=${freshFarmId}`,"GET",null, offToken);
    const reportRes = await testSessionContext.run({token: offToken}, ()=> reportHandler(reportReq as any));
    expect(reportRes.status).toBe(200);
    const report:any = await reportRes.json();
    expect(report.tasks.length).toBeGreaterThan(0);
    // Cleanup fresh farm
    await prisma.task.deleteMany({where:{farmId: freshFarmId}});
    await prisma.agronomyPlan.deleteMany({where:{farmId: freshFarmId}});
    await prisma.attendance.deleteMany({where:{farmId: freshFarmId}});
    await prisma.cropMonitoring.deleteMany({where:{farmId: freshFarmId}});
    await prisma.incident.deleteMany({where:{farmId: freshFarmId}});
    await prisma.locationChangeRequest.deleteMany({where:{farmId: freshFarmId}});
    await prisma.farmAccess.deleteMany({where:{farmId: freshFarmId}});
    await prisma.cropCycle.deleteMany({where:{plotId: freshPlot.id}});
    await prisma.plot.deleteMany({where:{id: freshPlot.id}});
    await prisma.farm.deleteMany({where:{id: freshFarmId}});
  });
});
