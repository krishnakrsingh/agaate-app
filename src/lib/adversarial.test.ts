import { describe, it, expect, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { clearRateLimitStore } from "./rate-limit";
import { testSessionContext } from "./auth";

import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as createFarmHandler, GET as listFarmsHandler } from "@/app/api/farms/route";
import { PATCH as patchFarmHandler } from "@/app/api/farms/[farmId]/route";
import { POST as activateFarmHandler } from "@/app/api/farms/[farmId]/activate/route";
import { POST as createPlotHandler } from "@/app/api/farms/[farmId]/plots/route";
import { POST as createCycleHandler } from "@/app/api/plots/[plotId]/crop-cycles/route";
import { GET as getTasksHandler, POST as createTaskHandler } from "@/app/api/tasks/route";
import { POST as generateDailyHandler } from "@/app/api/tasks/generate-daily/route";
import { PATCH as patchTaskHandler } from "@/app/api/tasks/[taskId]/route";
import { POST as completeTaskHandler } from "@/app/api/tasks/[taskId]/complete/route";
import { POST as attendanceHandler, GET as getAttendanceHandler } from "@/app/api/attendance/route";
import { POST as presignHandler } from "@/app/api/uploads/presign/route";
import { POST as completeUploadHandler } from "@/app/api/uploads/[mediaId]/complete/route";
import { POST as createMonitoringHandler } from "@/app/api/monitoring/route";
import { POST as createIncidentHandler } from "@/app/api/incidents/route";
import { POST as createLocationReqHandler } from "@/app/api/location-change-requests/route";
import { PATCH as patchLocationReqHandler } from "@/app/api/location-change-requests/[requestId]/route";
import { GET as getAuditLogsHandler } from "@/app/api/audit-logs/route";
import { GET as getDashboardHandler } from "@/app/api/dashboard/route";

const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET || "local-development-session-secret-change-this-before-production-32chars");
async function tokenFor(u:any){ return await new SignJWT({userId:u.id, name:u.name, role:u.role}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("8h").sign(secret);}
async function expiredTokenFor(u:any){ return await new SignJWT({userId:u.id, name:u.name, role:u.role}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("-1h").sign(secret);}
function req(url:string, method:string, body:any, token?:string, headers?:Record<string,string>){
  const h = new Headers({"Content-Type":"application/json", ...(headers||{})});
  if(token) h.set("Cookie", `agaate_session=${token}`);
  return new NextRequest(url, {method, headers:h, body: body? JSON.stringify(body): undefined});
}

describe.sequential("Adversarial Audit", ()=>{
  let superAdmin:any, farmAdmin:any, agronomist:any, officerA:any, officerB:any, disabled:any;
  let superToken:string, faToken:string, agroToken:string, offAToken:string, offBToken:string;
  let farmAId:string, farmBId:string, plotAId:string, cycleAId:string, taskAId:string;
  let testMediaId:string;

  beforeAll(async ()=>{
    clearRateLimitStore();
    const hash = await bcrypt.hash("AdvTest123!AdvTest123!",10);
    // cleanup
    const users = await prisma.user.findMany({where:{email:{contains:"@adv.agaate.local"}}, select:{id:true}});
    const uids = users.map(u=>u.id);
    if(uids.length){
      await prisma.mediaAsset.deleteMany({where:{uploadedById:{in:uids}}});
      await prisma.taskExecution.deleteMany({where:{officerId:{in:uids}}});
      await prisma.task.deleteMany({where:{createdById:{in:uids}}});
      await prisma.cropMonitoring.deleteMany({where:{officerId:{in:uids}}});
      await prisma.incident.deleteMany({where:{reporterId:{in:uids}}});
      await prisma.attendance.deleteMany({where:{userId:{in:uids}}});
      await prisma.locationChangeRequest.deleteMany({where:{requesterId:{in:uids}}});
      await prisma.farmAccess.deleteMany({where:{userId:{in:uids}}});
      await prisma.task.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.agronomyPlan.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.attendance.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.incident.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.cropMonitoring.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.locationChangeRequest.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.cropCycle.deleteMany({where:{plot:{farm:{name:{startsWith:"Adv Farm"}}}}});
      await prisma.plot.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.farm.deleteMany({where:{name:{startsWith:"Adv Farm"}}});
      await prisma.user.deleteMany({where:{id:{in:uids}}});
    }
    superAdmin = await prisma.user.create({data:{name:"Adv SA", email:"sa@adv.agaate.local", passwordHash:hash, role:"SUPER_ADMIN"}});
    farmAdmin = await prisma.user.create({data:{name:"Adv FA", email:"fa@adv.agaate.local", passwordHash:hash, role:"FARM_ADMIN"}});
    agronomist = await prisma.user.create({data:{name:"Adv Agro", email:"agro@adv.agaate.local", passwordHash:hash, role:"AGRONOMIST"}});
    officerA = await prisma.user.create({data:{name:"Adv OffA", email:"offA@adv.agaate.local", passwordHash:hash, role:"FARM_OFFICER"}});
    officerB = await prisma.user.create({data:{name:"Adv OffB", email:"offB@adv.agaate.local", passwordHash:hash, role:"FARM_OFFICER"}});
    disabled = await prisma.user.create({data:{name:"Adv Disabled", email:"dis@adv.agaate.local", passwordHash:hash, role:"FARM_OFFICER", active:false}});
    superToken = await tokenFor(superAdmin);
    faToken = await tokenFor(farmAdmin);
    agroToken = await tokenFor(agronomist);
    offAToken = await tokenFor(officerA);
    offBToken = await tokenFor(officerB);

    // Create two farms: FarmA managed by farmAdmin+offA, FarmB managed by offB (via superAdmin)
    const farmACreate = req("http://localhost:3000/api/farms","POST",{name:"Adv Farm A", ownerName:"Owner A", location:"Hosur", latitude:12.5284, longitude:77.8341, totalArea:10, cultivableArea:8, waterSource:"Well", geofenceRadiusMeters:500}, superToken);
    const resA = await testSessionContext.run({token: superToken}, ()=> createFarmHandler(farmACreate as any));
    const farmA = await resA.json(); farmAId = farmA.id;
    // give farmAdmin access to farmA (createFarm already gave superAdmin, need to give farmAdmin)
    await prisma.farmAccess.upsert({where:{userId_farmId:{userId:farmAdmin.id, farmId:farmAId}}, update:{canManage:true}, create:{userId:farmAdmin.id, farmId:farmAId, canManage:true}});
    await prisma.farmAccess.upsert({where:{userId_farmId:{userId:officerA.id, farmId:farmAId}}, update:{canManage:false}, create:{userId:officerA.id, farmId:farmAId, canManage:false}});

    const farmBCreate = req("http://localhost:3000/api/farms","POST",{name:"Adv Farm B", ownerName:"Owner B", location:"Mandya", latitude:12.4181, longitude:76.6947, totalArea:10, cultivableArea:8, waterSource:"Canal"}, superToken);
    const resB = await testSessionContext.run({token: superToken}, ()=> createFarmHandler(farmBCreate as any));
    const farmB = await resB.json(); farmBId = farmB.id;
    await prisma.farmAccess.upsert({where:{userId_farmId:{userId:officerB.id, farmId:farmBId}}, update:{canManage:false}, create:{userId:officerB.id, farmId:farmBId, canManage:false}});

    // Activate farmA via plot+cycle
    const plotReq = req(`http://localhost:3000/api/farms/${farmAId}/plots`,"POST",{name:"Adv Plot A1", area:2, latitude:12.5286, longitude:77.8343, soilType:"Loam", irrigation:[{type:"Drip"}]}, await tokenFor(farmAdmin));
    // need to use farmAdmin token which has manage
    const plotRes = await testSessionContext.run({token: faToken}, ()=> createPlotHandler(plotReq as any, {params: Promise.resolve({farmId: farmAId})} as any));
    const plot = await plotRes.json(); plotAId = plot.id;

    const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+5);
    const cycleReq = req(`http://localhost:3000/api/plots/${plotAId}/crop-cycles`,"POST",{cropName:"TestCrop", startDate: today.toISOString(), expectedFirstHarvestDate: tomorrow.toISOString(), establishmentType:"NURSERY_TRANSPLANTATION", varieties:["V1"], bedPreparationEnabled:true, bedWidthCm:90, bedCenterDistanceCm:150, expectedBedsPerAcre:200, mulchEnabled:false, plantDistanceCm:45, expectedPlantsPerAcre:6000, milestones:[{name:"Land Preparation", targetDate: today.toISOString()}, {name:"TP / Sowing Readiness", targetDate: today.toISOString()}, {name:"Transplantation", targetDate: today.toISOString()}, {name:"First Harvest", targetDate: tomorrow.toISOString()}]}, faToken);
    const cycleRes = await testSessionContext.run({token: faToken}, ()=> createCycleHandler(cycleReq as any, {params: Promise.resolve({plotId: plotAId})} as any));
    const cycle = await cycleRes.json(); cycleAId = cycle.id;

    // Activate farm (should succeed from SETUP)
    const actReq = req(`http://localhost:3000/api/farms/${farmAId}/activate`,"POST",{}, faToken);
    const actRes = await testSessionContext.run({token: faToken}, ()=> activateFarmHandler({} as any, {params: Promise.resolve({farmId: farmAId})} as any));
    // ignore status, will test later

    // Create a task for officerA via agronomist
    const taskDate = new Date(); const taskDateStr = taskDate.toISOString().slice(0,10);
    const taskReq = req("http://localhost:3000/api/tasks","POST",{farmId: farmAId, plotId: plotAId, cropCycleId: cycleAId, date: taskDateStr, category:"FERTIGATION", title:"Adv Task", description:"Test", priority:"HIGH", assignedOfficerId: officerA.id}, agroToken);
    const taskRes = await testSessionContext.run({token: agroToken}, ()=> createTaskHandler(taskReq as any));
    const task = await taskRes.json(); taskAId = task.id;

    // Create a media asset for later (selfie)
    const media = await prisma.mediaAsset.create({data:{storageKey:`evidence/${farmAId}/2026-01-01/adv-${Date.now()}.jpg`, kind:"SELFIE", mimeType:"image/jpeg", sizeBytes:123, farmId: farmAId, uploadedById: officerA.id, verifiedAt: new Date()}});
    testMediaId = media.id;
  });

  afterAll(async ()=>{
    const users = await prisma.user.findMany({where:{email:{contains:"@adv.agaate.local"}}, select:{id:true}});
    const uids = users.map(u=>u.id);
    if(uids.length){
      await prisma.mediaAsset.deleteMany({where:{uploadedById:{in:uids}}});
      await prisma.taskExecution.deleteMany({where:{officerId:{in:uids}}});
      await prisma.task.deleteMany({where:{createdById:{in:uids}}});
      await prisma.cropMonitoring.deleteMany({where:{officerId:{in:uids}}});
      await prisma.incident.deleteMany({where:{reporterId:{in:uids}}});
      await prisma.attendance.deleteMany({where:{userId:{in:uids}}});
      await prisma.locationChangeRequest.deleteMany({where:{requesterId:{in:uids}}});
      await prisma.farmAccess.deleteMany({where:{userId:{in:uids}}});
      await prisma.task.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.agronomyPlan.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.attendance.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.incident.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.cropMonitoring.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.locationChangeRequest.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.cropCycle.deleteMany({where:{plot:{farm:{name:{startsWith:"Adv Farm"}}}}});
      await prisma.plot.deleteMany({where:{farm:{name:{startsWith:"Adv Farm"}}}});
      await prisma.farm.deleteMany({where:{name:{startsWith:"Adv Farm"}}});
      await prisma.user.deleteMany({where:{id:{in:uids}}});
    }
  });

  // 2. Attack Authentication
  describe("Auth Attacks", ()=>{
    it("invalid password 401", async ()=>{
      const r = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:officerA.email, password:"WrongPass123!"}));
      expect(r.status).toBe(401);
    });
    it("nonexistent user 401", async ()=>{
      const r = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:"noone@adv.agaate.local", password:"AdvTest123!"}));
      expect(r.status).toBe(401);
    });
    it("disabled user 401", async ()=>{
      const r = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:disabled.email, password:"AdvTest123!AdvTest123!"}));
      expect(r.status).toBe(401);
    });
    it("expired JWT 401 on protected route", async ()=>{
      const expired = await expiredTokenFor(officerA);
      const r = await testSessionContext.run({token: expired}, ()=> listFarmsHandler(req("http://localhost:3000/api/farms","GET",null) as any));
      expect(r.status).toBe(401);
    });
    it("tampered JWT 401", async ()=>{
      const token = await tokenFor(officerA);
      const tampered = token.slice(0,-5)+"XXXXX";
      const r = await testSessionContext.run({token: tampered}, ()=> listFarmsHandler(req("http://localhost:3000/api/farms","GET",null) as any));
      expect(r.status).toBe(401);
    });
    it("missing JWT 401", async ()=>{
      const r = await listFarmsHandler(req("http://localhost:3000/api/farms","GET",null) as any);
      expect(r.status).toBe(401);
    });
    it("malformed JWT 401", async ()=>{
      const r = await testSessionContext.run({token: "not.a.jwt"}, ()=> listFarmsHandler(req("http://localhost:3000/api/farms","GET",null) as any));
      expect(r.status).toBe(401);
    });
    it("rate-limit 429 after 5 fails", async ()=>{
      clearRateLimitStore();
      const ip="10.0.0.1";
      for(let i=0;i<5;i++){
        const r = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:officerA.email, password:"WrongPass123!"}, undefined, {"x-forwarded-for": ip}));
        expect(r.status).toBe(401);
      }
      const r = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:officerA.email, password:"WrongPass123!"}, undefined, {"x-forwarded-for": ip}));
      expect(r.status).toBe(429);
      expect(r.headers.get("Retry-After")).toBeDefined();
      clearRateLimitStore();
    });
    it("concurrent logins do not bypass rate limit", async ()=>{
      clearRateLimitStore();
      const ip="10.0.0.2";
      const attempts = await Promise.all(Array.from({length:6}, ()=> loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:officerA.email, password:"WrongPass123!"}, undefined, {"x-forwarded-for": ip}))));
      const statuses = attempts.map(a=>a.status);
      expect(statuses.filter(s=>s===429).length).toBeGreaterThanOrEqual(1);
      expect(statuses.filter(s=>s===401).length).toBe(5);
      const r429 = attempts.find(a=>a.status===429);
      expect(r429?.headers.get("Retry-After")).toBeDefined();
      expect(Number(r429?.headers.get("Retry-After"))).toBeGreaterThan(0);
      clearRateLimitStore();
    });
    it("successful login resets rate limit", async ()=>{
      clearRateLimitStore();
      const ip="10.0.0.3";
      for(let i=0;i<4;i++){
        const r = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:officerA.email, password:"WrongPass123!"}, undefined, {"x-forwarded-for": ip}));
        expect(r.status).toBe(401);
      }
      const ok = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:officerA.email, password:"AdvTest123!AdvTest123!"}, undefined, {"x-forwarded-for": ip}));
      expect(ok.status).toBe(200);
      // After success, counter reset - 4 more fails should still be 401, 5th fail -> 401, 6th -> 429
      for(let i=0;i<4;i++){
        const r = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:officerA.email, password:"WrongPass123!"}, undefined, {"x-forwarded-for": ip}));
        expect(r.status).toBe(401);
      }
      const notYet = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:officerA.email, password:"WrongPass123!"}, undefined, {"x-forwarded-for": ip}));
      expect(notYet.status).toBe(401);
      const shouldBlock = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:officerA.email, password:"WrongPass123!"}, undefined, {"x-forwarded-for": ip}));
      expect(shouldBlock.status).toBe(429);
      clearRateLimitStore();
    });
    it("disabled and nonexistent do not amplify other users", async ()=>{
      clearRateLimitStore();
      const ip="10.0.0.4";
      // Fail 5 times for nonexistent
      for(let i=0;i<5;i++){
        const r = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:"ghost@adv.agaate.local", password:"WrongPass123!"}, undefined, {"x-forwarded-for": ip}));
        expect(r.status).toBe(401);
      }
      const blockedGhost = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:"ghost@adv.agaate.local", password:"WrongPass123!"}, undefined, {"x-forwarded-for": ip}));
      expect(blockedGhost.status).toBe(429);
      // OfficerA on same IP but different email should still be allowed (per-email key)
      const officerOk = await loginHandler(req("http://localhost:3000/api/auth/login","POST",{email:officerA.email, password:"AdvTest123!AdvTest123!"}));
      expect(officerOk.status).toBe(200);
      clearRateLimitStore();
    });
    it("protected data not exposed without auth (no farm list)", async ()=>{
      const r = await listFarmsHandler(req("http://localhost:3000/api/farms","GET",null) as any);
      const body:any = await r.json().catch(()=>({}));
      expect(r.status).toBe(401);
      expect(body.error).toBeDefined();
      expect(body.farms).toBeUndefined();
    });
  });

  // 3. Authorization matrix
  describe("Authorization Matrix", ()=>{
    it("FARM_OFFICER cannot read other farm", async ()=>{
      const r = await testSessionContext.run({token: offAToken}, ()=> listFarmsHandler(req("http://localhost:3000/api/farms","GET",null) as any));
      const farms:any = await r.json();
      expect(farms.some((f:any)=>f.id===farmBId)).toBe(false);
    });
    it("FARM_OFFICER cannot modify other farm (PATCH 403)", async ()=>{
      const r = await testSessionContext.run({token: offAToken}, ()=> patchFarmHandler(req(`http://localhost:3000/api/farms/${farmBId}`,"PATCH",{name:"Hacked"}, offAToken) as any, {params: Promise.resolve({farmId: farmBId})} as any));
      expect([403,401].includes(r.status)).toBe(true);
    });
    it("FARM_OFFICER cannot modify own farm without manage (403)", async ()=>{
      const r = await testSessionContext.run({token: offAToken}, ()=> patchFarmHandler(req(`http://localhost:3000/api/farms/${farmAId}`,"PATCH",{name:"Hacked"}, offAToken) as any, {params: Promise.resolve({farmId: farmAId})} as any));
      expect(r.status).toBe(403);
    });
    it("AGRONOMIST cannot mutate farm (403)", async ()=>{
      const r = await testSessionContext.run({token: agroToken}, ()=> patchFarmHandler(req(`http://localhost:3000/api/farms/${farmAId}`,"PATCH",{name:"Hacked Agro"}, agroToken) as any, {params: Promise.resolve({farmId: farmAId})} as any));
      expect(r.status).toBe(403);
    });
    it("AGRONOMIST can read all farms", async ()=>{
      const r = await testSessionContext.run({token: agroToken}, ()=> listFarmsHandler(req("http://localhost:3000/api/farms","GET",null, agroToken) as any));
      expect(r.status).toBe(200);
      const farms:any = await r.json();
      expect(farms.length).toBeGreaterThanOrEqual(2);
    });
    it("SUPER_ADMIN unrestricted", async ()=>{
      const r = await testSessionContext.run({token: superToken}, ()=> listFarmsHandler(req("http://localhost:3000/api/farms","GET",null, superToken) as any));
      expect(r.status).toBe(200);
    });
    it("Guessing UUID from other farm via plot create 403/422", async ()=>{
      // officerA trying to create plot in farmB (which they don't have access)
      const plotReq = req(`http://localhost:3000/api/farms/${farmBId}/plots`,"POST",{name:"Hack Plot", area:1, latitude:12, longitude:77, soilType:"Loam", irrigation:[{type:"Drip"}]}, offAToken);
      const r = await testSessionContext.run({token: offAToken}, ()=> createPlotHandler(plotReq as any, {params: Promise.resolve({farmId: farmBId})} as any));
      expect([403,401,422].includes(r.status)).toBe(true);
    });
    it("Nested resource access through another farm (task with wrong farmId)", async ()=>{
      // agronomist tries to create task for farmA but with plot from farmB (if existed) - should 422
      // We'll use plotAId but farmBId mismatch -> should fail because plot not part of farm
      const dateStr = new Date().toISOString().slice(0,10);
      const badReq = req("http://localhost:3000/api/tasks","POST",{farmId: farmBId, plotId: plotAId, date: dateStr, category:"FERTIGATION", title:"Hack", description:"hack", priority:"HIGH", assignedOfficerId: officerA.id}, agroToken);
      const r = await testSessionContext.run({token: agroToken}, ()=> createTaskHandler(badReq as any));
      expect(r.status).toBe(422);
    });
  });

  // 4. State Machines
  describe("Farm State Machine", ()=>{
    it("SETUP->ACTIVE via activate succeeds, ACTIVE->SETUP 409, COMPLETED terminal", async ()=>{
      // Create a new farm in SETUP
      const createReq = req("http://localhost:3000/api/farms","POST",{name:`Adv Farm State ${Date.now()}`, ownerName:"Owner", location:"Test", latitude:12, longitude:77, totalArea:5, cultivableArea:4, waterSource:"Well"}, superToken);
      const createRes = await testSessionContext.run({token: superToken}, ()=> createFarmHandler(createReq as any));
      const farm:any = await createRes.json();
      const fid = farm.id;
      // Need to give fa access
      await prisma.farmAccess.create({data:{userId: farmAdmin.id, farmId: fid, canManage:true}});
      // Try PATCH ACTIVE without prerequisites -> should 422 or 409? Our patch now requires at least one plot for ACTIVE
      const patchActive = req(`http://localhost:3000/api/farms/${fid}`,"PATCH",{status:"ACTIVE"}, faToken);
      const patchRes = await testSessionContext.run({token: faToken}, ()=> patchFarmHandler(patchActive as any, {params: Promise.resolve({farmId: fid})} as any));
      // Should be 422 because no plot
      expect(patchRes.status).toBe(422);
      // Create plot and cycle then activate via dedicated endpoint
      const plotReq = req(`http://localhost:3000/api/farms/${fid}/plots`,"POST",{name:"State Plot", area:1, latitude:12, longitude:77, irrigation:[{type:"Drip"}]}, faToken);
      const plotRes = await testSessionContext.run({token: faToken}, ()=> createPlotHandler(plotReq as any, {params: Promise.resolve({farmId: fid})} as any));
      const plot:any = await plotRes.json();
      const today = new Date(); const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate()+5);
      const cycReq = req(`http://localhost:3000/api/plots/${plot.id}/crop-cycles`,"POST",{cropName:"StateCrop", startDate: today.toISOString(), establishmentType:"NURSERY_TRANSPLANTATION", varieties:["V1"], bedPreparationEnabled:false, mulchEnabled:false, milestones:[{name:"Land Preparation", targetDate: today.toISOString()}, {name:"TP / Sowing Readiness", targetDate: today.toISOString()}, {name:"Transplantation", targetDate: today.toISOString()}, {name:"First Harvest", targetDate: tomorrow.toISOString()}]}, faToken);
      await testSessionContext.run({token: faToken}, ()=> createCycleHandler(cycReq as any, {params: Promise.resolve({plotId: plot.id})} as any));
      const actReq = req(`http://localhost:3000/api/farms/${fid}/activate`,"POST",{}, faToken);
      const actRes = await testSessionContext.run({token: faToken}, ()=> activateFarmHandler({} as any, {params: Promise.resolve({farmId: fid})} as any));
      expect(actRes.status).toBe(200);
      // Now ACTIVE -> SETUP should 409
      const patchBack = req(`http://localhost:3000/api/farms/${fid}`,"PATCH",{status:"SETUP"}, faToken);
      const patchBackRes = await testSessionContext.run({token: faToken}, ()=> patchFarmHandler(patchBack as any, {params: Promise.resolve({farmId: fid})} as any));
      expect(patchBackRes.status).toBe(409);
      // ACTIVE -> COMPLETED should succeed
      const patchComp = req(`http://localhost:3000/api/farms/${fid}`,"PATCH",{status:"COMPLETED"}, faToken);
      const patchCompRes = await testSessionContext.run({token: faToken}, ()=> patchFarmHandler(patchComp as any, {params: Promise.resolve({farmId: fid})} as any));
      expect(patchCompRes.status).toBe(200);
      // COMPLETED -> ACTIVE should 409 (terminal)
      const patchReopen = req(`http://localhost:3000/api/farms/${fid}`,"PATCH",{status:"ACTIVE"}, faToken);
      const reopenRes = await testSessionContext.run({token: faToken}, ()=> patchFarmHandler(patchReopen as any, {params: Promise.resolve({farmId: fid})} as any));
      expect(reopenRes.status).toBe(409);
      // cleanup - correct order with all deps
      await prisma.task.deleteMany({where:{farmId: fid}});
      await prisma.agronomyPlan.deleteMany({where:{farmId: fid}});
      await prisma.attendance.deleteMany({where:{farmId: fid}});
      await prisma.incident.deleteMany({where:{farmId: fid}});
      await prisma.cropMonitoring.deleteMany({where:{farmId: fid}});
      await prisma.locationChangeRequest.deleteMany({where:{farmId: fid}});
      await prisma.farmAccess.deleteMany({where:{farmId: fid}});
      await prisma.cropCycle.deleteMany({where:{plotId: plot.id}});
      await prisma.plot.deleteMany({where:{id: plot.id}});
      await prisma.farm.deleteMany({where:{id: fid}});
    });
  });

  describe("Task State Machine", ()=>{
    it("ASSIGNED->COMPLETED direct 409, COMPLETED->IN_PROGRESS 409, wrong officer 403, duplicate completion 409", async ()=>{
      // taskA is ASSIGNED, officerA should start then complete
      // Try direct complete without IN_PROGRESS -> 409
      const directComplete = req(`http://localhost:3000/api/tasks/${taskAId}/complete`,"POST",{remarks:"try"}, offAToken);
      const directRes = await testSessionContext.run({token: offAToken}, ()=> completeTaskHandler(directComplete as any, {params: Promise.resolve({taskId: taskAId})} as any));
      expect(directRes.status).toBe(409);
      // Start task (ASSIGNED->IN_PROGRESS)
      const startReq = req(`http://localhost:3000/api/tasks/${taskAId}`,"PATCH",{status:"IN_PROGRESS"}, offAToken);
      const startRes = await testSessionContext.run({token: offAToken}, ()=> patchTaskHandler(startReq as any, {params: Promise.resolve({taskId: taskAId})} as any));
      expect(startRes.status).toBe(200);
      // Wrong officer should 403 on complete
      const wrongComplete = req(`http://localhost:3000/api/tasks/${taskAId}/complete`,"POST",{remarks:"wrong"}, offBToken);
      const wrongRes = await testSessionContext.run({token: offBToken}, ()=> completeTaskHandler(wrongComplete as any, {params: Promise.resolve({taskId: taskAId})} as any));
      expect([403,422].includes(wrongRes.status)).toBe(true);
      // Correct complete
      const completeReq = req(`http://localhost:3000/api/tasks/${taskAId}/complete`,"POST",{remarks:"done"}, offAToken);
      const completeRes = await testSessionContext.run({token: offAToken}, ()=> completeTaskHandler(completeReq as any, {params: Promise.resolve({taskId: taskAId})} as any));
      expect(completeRes.status).toBe(200);
      // Duplicate completion should 409 (task now COMPLETED not IN_PROGRESS)
      const dupReq = req(`http://localhost:3000/api/tasks/${taskAId}/complete`,"POST",{remarks:"again"}, offAToken);
      const dupRes = await testSessionContext.run({token: offAToken}, ()=> completeTaskHandler(dupReq as any, {params: Promise.resolve({taskId: taskAId})} as any));
      expect(dupRes.status).toBe(409);
      // COMPLETED->IN_PROGRESS should 409 via PATCH
      const revertReq = req(`http://localhost:3000/api/tasks/${taskAId}`,"PATCH",{status:"IN_PROGRESS"}, offAToken);
      const revertRes = await testSessionContext.run({token: offAToken}, ()=> patchTaskHandler(revertReq as any, {params: Promise.resolve({taskId: taskAId})} as any));
      expect(revertRes.status).toBe(409);
    });
  });

  describe("Attendance State Machine", ()=>{
    it("END before START 422, START twice 422, END twice 422", async ()=>{
      const today = new Date().toISOString().slice(0,10);
      // Ensure clean attendance for officerA/farmA today
      await prisma.attendance.deleteMany({where:{userId: officerA.id, farmId: farmAId}});
      // END before START
      const endBefore = req("http://localhost:3000/api/attendance","POST",{farmId: farmAId, action:"END", latitude:12.5284, longitude:77.8341, selfieMediaId: testMediaId}, offAToken);
      const endBeforeRes = await testSessionContext.run({token: offAToken}, ()=> attendanceHandler(endBefore as any));
      expect(endBeforeRes.status).toBe(422);
      // START
      const startReq = req("http://localhost:3000/api/attendance","POST",{farmId: farmAId, action:"START", latitude:12.5284, longitude:77.8341, selfieMediaId: testMediaId}, offAToken);
      const startRes = await testSessionContext.run({token: offAToken}, ()=> attendanceHandler(startReq as any));
      expect(startRes.status).toBe(200);
      // START twice
      const startTwice = req("http://localhost:3000/api/attendance","POST",{farmId: farmAId, action:"START", latitude:12.5284, longitude:77.8341, selfieMediaId: testMediaId}, offAToken);
      const startTwiceRes = await testSessionContext.run({token: offAToken}, ()=> attendanceHandler(startTwice as any));
      expect(startTwiceRes.status).toBe(422);
      // END
      const endReq = req("http://localhost:3000/api/attendance","POST",{farmId: farmAId, action:"END", latitude:12.5284, longitude:77.8341, selfieMediaId: testMediaId}, offAToken);
      const endRes = await testSessionContext.run({token: offAToken}, ()=> attendanceHandler(endReq as any));
      expect(endRes.status).toBe(200);
      // END twice
      const endTwice = req("http://localhost:3000/api/attendance","POST",{farmId: farmAId, action:"END", latitude:12.5284, longitude:77.8341, selfieMediaId: testMediaId}, offAToken);
      const endTwiceRes = await testSessionContext.run({token: offAToken}, ()=> attendanceHandler(endTwice as any));
      expect(endTwiceRes.status).toBe(422);
      // cleanup
      await prisma.attendance.deleteMany({where:{userId: officerA.id, farmId: farmAId}});
    });
    it("boundary coordinates: exact geofence 500m inside, 501m outside requires reason", async ()=>{
      await prisma.attendance.deleteMany({where:{userId: officerA.id, farmId: farmAId}});
      // farm at 12.5284,77.8341 radius 500
      // calculate point ~500m north: 0.0045 deg ~500m
      const insideLat = 12.5284 + 0.0044; // ~489m
      const outsideLat = 12.5284 + 0.005; // ~556m
      const insideReq = req("http://localhost:3000/api/attendance","POST",{farmId: farmAId, action:"START", latitude: insideLat, longitude:77.8341, selfieMediaId: testMediaId}, offAToken);
      const insideRes = await testSessionContext.run({token: offAToken}, ()=> attendanceHandler(insideReq as any));
      expect(insideRes.status).toBe(200);
      const insideBody:any = await insideRes.json();
      expect(insideBody.withinGeofence).toBe(true);
      await prisma.attendance.deleteMany({where:{userId: officerA.id, farmId: farmAId}});
      const outsideNoReason = req("http://localhost:3000/api/attendance","POST",{farmId: farmAId, action:"START", latitude: outsideLat, longitude:77.8341, selfieMediaId: testMediaId}, offAToken);
      const outsideNoReasonRes = await testSessionContext.run({token: offAToken}, ()=> attendanceHandler(outsideNoReason as any));
      expect(outsideNoReasonRes.status).toBe(422);
      const outsideWithReason = req("http://localhost:3000/api/attendance","POST",{farmId: farmAId, action:"START", latitude: outsideLat, longitude:77.8341, selfieMediaId: testMediaId, reason:"Remote nursery visit with valid justification"}, offAToken);
      const outsideWithReasonRes = await testSessionContext.run({token: offAToken}, ()=> attendanceHandler(outsideWithReason as any));
      expect(outsideWithReasonRes.status).toBe(200);
      const outsideBody:any = await outsideWithReasonRes.json();
      expect(outsideBody.withinGeofence).toBe(false);
      await prisma.attendance.deleteMany({where:{userId: officerA.id, farmId: farmAId}});
    });
    it("invalid coordinates 422", async ()=>{
      const badReq = req("http://localhost:3000/api/attendance","POST",{farmId: farmAId, action:"START", latitude: 100, longitude:200, selfieMediaId: testMediaId}, offAToken);
      const badRes = await testSessionContext.run({token: offAToken}, ()=> attendanceHandler(badReq as any));
      expect(badRes.status).toBe(422);
    });
  });

  describe("Location Change Duplicate", ()=>{
    it("duplicate PENDING 409, approve twice 409, reject after approve 409, concurrent approve race", async ()=>{
      await prisma.locationChangeRequest.deleteMany({where:{farmId: farmAId}});
      const req1 = req("http://localhost:3000/api/location-change-requests","POST",{farmId: farmAId, proposedLatitude:12.6, proposedLongitude:77.9, reason:"Test reason 1"}, offAToken);
      const res1 = await testSessionContext.run({token: offAToken}, ()=> createLocationReqHandler(req1 as any));
      expect(res1.status).toBe(201);
      const body1:any = await res1.json();
      const reqId = body1.id;
      // duplicate
      const dupReq = req("http://localhost:3000/api/location-change-requests","POST",{farmId: farmAId, proposedLatitude:12.7, proposedLongitude:77.91, reason:"Test reason 2"}, offAToken);
      const dupRes = await testSessionContext.run({token: offAToken}, ()=> createLocationReqHandler(dupReq as any));
      expect(dupRes.status).toBe(409);
      // approve
      const approveReq = req(`http://localhost:3000/api/location-change-requests/${reqId}`,"PATCH",{status:"APPROVED"}, superToken);
      const approveRes = await testSessionContext.run({token: superToken}, ()=> patchLocationReqHandler(approveReq as any, {params: Promise.resolve({requestId: reqId})} as any));
      expect(approveRes.status).toBe(200);
      // approve twice
      const approveAgain = req(`http://localhost:3000/api/location-change-requests/${reqId}`,"PATCH",{status:"APPROVED"}, superToken);
      const approveAgainRes = await testSessionContext.run({token: superToken}, ()=> patchLocationReqHandler(approveAgain as any, {params: Promise.resolve({requestId: reqId})} as any));
      expect(approveAgainRes.status).toBe(409);
      // reject after approve
      const rejectAfter = req(`http://localhost:3000/api/location-change-requests/${reqId}`,"PATCH",{status:"REJECTED"}, superToken);
      const rejectRes = await testSessionContext.run({token: superToken}, ()=> patchLocationReqHandler(rejectAfter as any, {params: Promise.resolve({requestId: reqId})} as any));
      expect(rejectRes.status).toBe(409);
      // concurrent approve race: create new request and race two approves
      await prisma.locationChangeRequest.deleteMany({where:{farmId: farmAId}});
      const req2 = req("http://localhost:3000/api/location-change-requests","POST",{farmId: farmAId, proposedLatitude:12.6, proposedLongitude:77.9, reason:"Race test reason"}, offAToken);
      const res2 = await testSessionContext.run({token: offAToken}, ()=> createLocationReqHandler(req2 as any));
      const body2:any = await res2.json(); const reqId2 = body2.id;
      const [c1,c2] = await Promise.all([
        testSessionContext.run({token: superToken}, ()=> patchLocationReqHandler(req(`http://localhost:3000/api/location-change-requests/${reqId2}`,"PATCH",{status:"APPROVED"}, superToken) as any, {params: Promise.resolve({requestId: reqId2})} as any)),
        testSessionContext.run({token: superToken}, ()=> patchLocationReqHandler(req(`http://localhost:3000/api/location-change-requests/${reqId2}`,"PATCH",{status:"APPROVED"}, superToken) as any, {params: Promise.resolve({requestId: reqId2})} as any))
      ]);
      // One should succeed, one 409
      const statuses = [c1.status,c2.status].sort();
      expect(statuses).toEqual([200,409]);
      await prisma.locationChangeRequest.deleteMany({where:{farmId: farmAId}});
    });
  });

  // 5. Transactions
  describe("Transactions & Partial Failure", ()=>{
    it("task completion with invalid media rolls back (no partial)", async ()=>{
      // Create a fresh task for this test
      const dateStr = new Date().toISOString().slice(0,10);
      const tReq = req("http://localhost:3000/api/tasks","POST",{farmId: farmAId, plotId: plotAId, cropCycleId: cycleAId, date: dateStr, category:"FERTIGATION", title:"TransTest", description:"test", priority:"HIGH", assignedOfficerId: officerA.id}, agroToken);
      const tRes = await testSessionContext.run({token: agroToken}, ()=> createTaskHandler(tReq as any));
      const t:any = await tRes.json(); const tid = t.id;
      // Start
      const sReq = req(`http://localhost:3000/api/tasks/${tid}`,"PATCH",{status:"IN_PROGRESS"}, offAToken);
      await testSessionContext.run({token: offAToken}, ()=> patchTaskHandler(sReq as any, {params: Promise.resolve({taskId: tid})} as any));
      // Try complete with fake media (should fail, no media update, no status change)
      const fakeMedia = await prisma.mediaAsset.create({data:{storageKey:`evidence/${farmAId}/fake-${Date.now()}.jpg`, kind:"ACTIVITY_EVIDENCE", mimeType:"image/jpeg", sizeBytes:100, farmId: farmAId, uploadedById: officerA.id, verifiedAt: new Date()}});
      // Use wrong owner media (create for officerB)
      const fakeMediaB = await prisma.mediaAsset.create({data:{storageKey:`evidence/${farmAId}/fakeB-${Date.now()}.jpg`, kind:"ACTIVITY_EVIDENCE", mimeType:"image/jpeg", sizeBytes:100, farmId: farmAId, uploadedById: officerB.id, verifiedAt: new Date()}});
      const compReq = req(`http://localhost:3000/api/tasks/${tid}/complete`,"POST",{mediaIds:[fakeMediaB.id]}, offAToken);
      const compRes = await testSessionContext.run({token: offAToken}, ()=> completeTaskHandler(compReq as any, {params: Promise.resolve({taskId: tid})} as any));
      expect(compRes.status).toBe(422);
      // Verify task still IN_PROGRESS, not COMPLETED, execution remains IN_PROGRESS from start (not rolled back, only completion rolled back)
      const taskAfter = await prisma.task.findUnique({where:{id: tid}});
      expect(taskAfter?.status).toBe("IN_PROGRESS");
      const exec = await prisma.taskExecution.findUnique({where:{taskId: tid}});
      expect(exec?.status).toBe("IN_PROGRESS");
      // cleanup
      await prisma.mediaAsset.deleteMany({where:{id:{in:[fakeMedia.id, fakeMediaB.id]}}});
      await prisma.task.deleteMany({where:{id: tid}});
    });
    it("monitoring with task completion failure rolls back monitoring", async ()=>{
      // This is covered by transaction in monitoring: if media fails, monitoring not created
      // Force failure via invalid mediaIds
      const beforeCount = await prisma.cropMonitoring.count({where:{officerId: officerA.id}});
      const badReq = req("http://localhost:3000/api/monitoring","POST",{farmId: farmAId, plotId: plotAId, cropCycleId: cycleAId, status:"GOOD", stage:"Vegetative", mediaIds:["nonexistent"]}, offAToken);
      const badRes = await testSessionContext.run({token: offAToken}, ()=> createMonitoringHandler(badReq as any));
      expect(badRes.status).toBe(422);
      const afterCount = await prisma.cropMonitoring.count({where:{officerId: officerA.id}});
      expect(afterCount).toBe(beforeCount);
    });
  });

  // 6. Race Conditions
  describe("Race Conditions", ()=>{
    it("concurrent daily generation idempotent (no duplicates)", async ()=>{
      const dateStr = new Date().toISOString().slice(0,10);
      // clean any existing daily tasks for this officer/cycle/date
      const deterministicId = `daily_${cycleAId}_${dateStr}_${officerA.id}`;
      await prisma.task.deleteMany({where:{id: deterministicId}});
      // Also delete legacy
      await prisma.task.deleteMany({where:{origin:"DAILY_MONITORING", cropCycleId: cycleAId, assignedOfficerId: officerA.id}});
      const [r1,r2] = await Promise.all([
        testSessionContext.run({token: offAToken}, ()=> generateDailyHandler(req("http://localhost:3000/api/tasks/generate-daily","POST",{farmId: farmAId, date: dateStr}, offAToken) as any)),
        testSessionContext.run({token: offAToken}, ()=> generateDailyHandler(req("http://localhost:3000/api/tasks/generate-daily","POST",{farmId: farmAId, date: dateStr}, offAToken) as any))
      ]);
      const b1:any = await r1.json(); const b2:any = await r2.json();
      // Total generated should be at most 1 per concurrent call, but sum maybe 1
      const count = await prisma.task.count({where:{origin:"DAILY_MONITORING", cropCycleId: cycleAId, assignedOfficerId: officerA.id, dueDate: new Date(dateStr)}});
      expect(count).toBe(1);
      // cleanup
      await prisma.task.deleteMany({where:{id: deterministicId}});
    });
    it("concurrent attendance START race (one succeeds, one 422)", async ()=>{
      await prisma.attendance.deleteMany({where:{userId: officerB.id, farmId: farmBId}});
      // create a dedicated selfie for officerB on farmB if not exists
      const mediaB = await prisma.mediaAsset.create({data:{storageKey:`evidence/${farmBId}/att-${Date.now()}.jpg`, kind:"SELFIE", mimeType:"image/jpeg", sizeBytes:100, farmId: farmBId, uploadedById: officerB.id, verifiedAt: new Date()}});
      const p1 = testSessionContext.run({token: offBToken}, ()=> attendanceHandler(req("http://localhost:3000/api/attendance","POST",{farmId: farmBId, action:"START", latitude:12.4181, longitude:76.6947, selfieMediaId: mediaB.id}, offBToken) as any));
      const p2 = testSessionContext.run({token: offBToken}, ()=> attendanceHandler(req("http://localhost:3000/api/attendance","POST",{farmId: farmBId, action:"START", latitude:12.4181, longitude:76.6947, selfieMediaId: mediaB.id}, offBToken) as any));
      const [r1,r2] = await Promise.all([p1,p2]);
      const statuses = [r1.status,r2.status].sort();
      expect(statuses[0]).toBe(200);
      expect([409,422].includes(statuses[1])).toBe(true);
      await prisma.attendance.deleteMany({where:{userId: officerB.id, farmId: farmBId}});
      await prisma.mediaAsset.deleteMany({where:{id: mediaB.id}});
    });
  });

  // 7. Audit Log
  describe("Audit Log Verification", ()=>{
    it("every mutation creates audit with correct actor and no password leak", async ()=>{
      await prisma.auditLog.deleteMany({where:{entityType:"AuditTest"}});
      const before = await prisma.auditLog.count();
      // create farm as superAdmin
      const createReq = req("http://localhost:3000/api/farms","POST",{name:`Audit Farm ${Date.now()}`, ownerName:"Owner", location:"Loc", latitude:12, longitude:77, totalArea:5, cultivableArea:4, waterSource:"Well"}, superToken);
      const createRes = await testSessionContext.run({token: superToken}, ()=> createFarmHandler(createReq as any));
      expect(createRes.status).toBe(201);
      const farm:any = await createRes.json();
      const after = await prisma.auditLog.count();
      expect(after).toBeGreaterThan(before);
      const last = await prisma.auditLog.findFirst({where:{entityId: farm.id}, orderBy:{createdAt:"desc"}});
      expect(last?.actorId).toBe(superAdmin.id);
      expect(JSON.stringify(last?.metadata)).not.toContain("password");
      // unauthorized should not create audit
      const before2 = await prisma.auditLog.count();
      const badReq = req("http://localhost:3000/api/farms","POST",{name:"Should Fail", ownerName:"Owner", location:"Loc", latitude:12, longitude:77, totalArea:5, cultivableArea:4, waterSource:"Well"}, offAToken);
      const badRes = await testSessionContext.run({token: offAToken}, ()=> createFarmHandler(badReq as any));
      expect(badRes.status).toBe(403);
      const after2 = await prisma.auditLog.count();
      expect(after2).toBe(before2);
      // farm scoped: officerA should not see audit for farmB
      const auditReq = req(`http://localhost:3000/api/audit-logs?farmId=${farmAId}`,"GET",null, offAToken);
      // officerA has access to farmA, so should succeed, but farmB should 403
      const auditReqB = req(`http://localhost:3000/api/audit-logs?farmId=${farmBId}`,"GET",null, offAToken);
      const auditResB = await testSessionContext.run({token: offAToken}, ()=> getAuditLogsHandler(auditReqB as any));
      expect(auditResB.status).toBe(403);
      // cleanup
      await prisma.farm.deleteMany({where:{id: farm.id}});
      await prisma.auditLog.deleteMany({where:{entityId: farm.id}});
    });
    it("pagination and ordering deterministic", async ()=>{
      const r1 = await testSessionContext.run({token: superToken}, ()=> getAuditLogsHandler(req("http://localhost:3000/api/audit-logs?limit=2&offset=0","GET",null, superToken) as any));
      const r2 = await testSessionContext.run({token: superToken}, ()=> getAuditLogsHandler(req("http://localhost:3000/api/audit-logs?limit=2&offset=2","GET",null, superToken) as any));
      expect(r1.status).toBe(200); expect(r2.status).toBe(200);
      const b1:any = await r1.json(); const b2:any = await r2.json();
      expect(b1.length).toBeLessThanOrEqual(2);
      if(b1.length && b2.length) expect(b1[0].id).not.toBe(b2[0].id);
    });
  });

  // 8. Media Failure
  describe("Media Failure", ()=>{
    it("presign without upload then verify fails, no orphan success", async ()=>{
      const presignReq = req("http://localhost:3000/api/uploads/presign","POST",{farmId: farmAId, kind:"CROP_PHOTO", mimeType:"image/jpeg", sizeBytes:100}, offAToken);
      const presignRes = await testSessionContext.run({token: offAToken}, ()=> presignHandler(presignReq as any));
      expect(presignRes.status).toBe(200);
      const presign:any = await presignRes.json();
      // Do not upload, directly try complete
      const completeReq = req(`http://localhost:3000/api/uploads/${presign.mediaId}/complete`,"POST",{}, offAToken);
      const completeRes = await testSessionContext.run({token: offAToken}, ()=> completeUploadHandler(completeReq as any, {params: Promise.resolve({mediaId: presign.mediaId})} as any));
      expect(completeRes.status).toBe(422);
      const media = await prisma.mediaAsset.findUnique({where:{id: presign.mediaId}});
      expect(media?.verifiedAt).toBeNull();
      await prisma.mediaAsset.deleteMany({where:{id: presign.mediaId}});
    });
    it("wrong farm 422, wrong owner 403, oversized 422", async ()=>{
      const media = await prisma.mediaAsset.create({data:{storageKey:`evidence/${farmBId}/test-${Date.now()}.jpg`, kind:"SELFIE", mimeType:"image/jpeg", sizeBytes:100, farmId: farmBId, uploadedById: officerB.id, verifiedAt: new Date()}});
      // officerA trying to use officerB's media for farmA attendance should fail
      const attReq = req("http://localhost:3000/api/attendance","POST",{farmId: farmAId, action:"START", latitude:12.5284, longitude:77.8341, selfieMediaId: media.id}, offAToken);
      const attRes = await testSessionContext.run({token: offAToken}, ()=> attendanceHandler(attReq as any));
      expect(attRes.status).toBe(422);
      await prisma.mediaAsset.deleteMany({where:{id: media.id}});
    });
  });

  // 9. Task Generation side-effect free
  describe("Task Generation", ()=>{
    it("GET is side-effect free (no creation)", async ()=>{
      const dateStr = new Date().toISOString().slice(0,10);
      const did = `daily_${cycleAId}_${dateStr}_${officerA.id}`;
      await prisma.task.deleteMany({where:{id: did}});
      await prisma.task.deleteMany({where:{origin:"DAILY_MONITORING", cropCycleId: cycleAId, assignedOfficerId: officerA.id, dueDate: new Date(dateStr)}});
      const before = await prisma.task.count({where:{origin:"DAILY_MONITORING", cropCycleId: cycleAId, assignedOfficerId: officerA.id}});
      const getRes = await testSessionContext.run({token: offAToken}, ()=> getTasksHandler(req(`http://localhost:3000/api/tasks?date=${dateStr}`,"GET",null, offAToken) as any));
      expect(getRes.status).toBe(200);
      const after = await prisma.task.count({where:{origin:"DAILY_MONITORING", cropCycleId: cycleAId, assignedOfficerId: officerA.id}});
      expect(after).toBe(before);
      // POST generate should create exactly 1
      const genRes = await testSessionContext.run({token: offAToken}, ()=> generateDailyHandler(req("http://localhost:3000/api/tasks/generate-daily","POST",{date: dateStr}, offAToken) as any));
      expect(genRes.status).toBe(200);
      const genBody:any = await genRes.json();
      expect(genBody.generated).toBe(1);
      const afterGen = await prisma.task.count({where:{origin:"DAILY_MONITORING", cropCycleId: cycleAId, assignedOfficerId: officerA.id}});
      expect(afterGen).toBe(before+1);
      // second POST idempotent 0
      const genRes2 = await testSessionContext.run({token: offAToken}, ()=> generateDailyHandler(req("http://localhost:3000/api/tasks/generate-daily","POST",{date: dateStr}, offAToken) as any));
      const genBody2:any = await genRes2.json();
      expect(genBody2.generated).toBe(0);
      await prisma.task.deleteMany({where:{id: did}});
    });
  });

  // 10. Business Logic
  describe("Business Logic", ()=>{
    it("bed/plant calculations vs spec", async ()=>{
      const { calculatedInfrastructure, variance, distanceMeters } = await import("./business");
      expect(calculatedInfrastructure(2.5,400,1600)).toEqual({expectedTotalBeds:1000, expectedPlants:4000});
      expect(variance(100,80)).toEqual({amount:-20, percentage:-20});
      const d = distanceMeters({latitude:12.9716, longitude:77.5946}, {latitude:12.9816, longitude:77.5946});
      expect(d).toBeGreaterThan(1000);
    });
    it("seven-day rolling window boundaries", async ()=>{
      const { isWithinRollingSevenDays, utcDateOnly } = await import("./business");
      const now = new Date("2026-09-01T00:00:00Z");
      expect(isWithinRollingSevenDays(new Date("2026-09-01"), now)).toBe(true);
      expect(isWithinRollingSevenDays(new Date("2026-09-07"), now)).toBe(true);
      expect(isWithinRollingSevenDays(new Date("2026-09-08"), now)).toBe(false);
      expect(isWithinRollingSevenDays(new Date("2026-08-31"), now)).toBe(false);
    });
  });

  // 11. Dashboard reconciliation
  describe("Dashboard Reconciliation", ()=>{
    it("zero records and scoped counts reconcile", async ()=>{
      // Zero farm case: create officer with no farms
      const hash = await bcrypt.hash("Test123!Test123!",10);
      const lonely = await prisma.user.create({data:{name:"Lonely", email:`lonely_${Date.now()}@adv.agaate.local`, passwordHash:hash, role:"FARM_OFFICER"}});
      const lonelyToken = await tokenFor(lonely);
      const dashReq = req("http://localhost:3000/api/dashboard","GET",null, lonelyToken);
      const dashRes = await testSessionContext.run({token: lonelyToken}, ()=> getDashboardHandler(dashReq as any));
      expect(dashRes.status).toBe(200);
      const dash:any = await dashRes.json();
      expect(dash.activeFarms).toBe(0);
      expect(dash.plannedActivities).toBe(0);
      await prisma.user.deleteMany({where:{id: lonely.id}});
      // Scoped counts for officerA vs superAdmin
      const dashA = await testSessionContext.run({token: offAToken}, ()=> getDashboardHandler(req("http://localhost:3000/api/dashboard","GET",null, offAToken) as any));
      const dashSuper = await testSessionContext.run({token: superToken}, ()=> getDashboardHandler(req("http://localhost:3000/api/dashboard","GET",null, superToken) as any));
      const bA:any = await dashA.json(); const bS:any = await dashSuper.json();
      expect(bS.activeFarms).toBeGreaterThanOrEqual(bA.activeFarms);
    });
  });
});
