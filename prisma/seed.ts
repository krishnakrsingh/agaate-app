import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding comprehensive Agaate farm management system data...");

  const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || "LocalAdminPassword-ChangeMe-123";
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // 1. Create Core Hierarchy Users
  const superAdmin = await prisma.user.upsert({
    where: { email: "admin@agaate.local" },
    update: { name: "Super Admin (Global Director)", role: "SUPER_ADMIN", active: true, passwordHash },
    create: {
      name: "Super Admin (Global Director)",
      email: "admin@agaate.local",
      passwordHash,
      role: "SUPER_ADMIN",
      active: true,
    },
  });

  const farmAdmin = await prisma.user.upsert({
    where: { email: "farmadmin@agaate.local" },
    update: { name: "Vikram Mehta (Farm Admin)", role: "FARM_ADMIN", active: true, passwordHash },
    create: {
      name: "Vikram Mehta (Farm Admin)",
      email: "farmadmin@agaate.local",
      passwordHash,
      role: "FARM_ADMIN",
      active: true,
    },
  });

  const agronomist = await prisma.user.upsert({
    where: { email: "agronomist@agaate.local" },
    update: { name: "Dr. Ananya Rao (Senior Agronomist)", role: "AGRONOMIST", active: true, passwordHash },
    create: {
      name: "Dr. Ananya Rao (Senior Agronomist)",
      email: "agronomist@agaate.local",
      passwordHash,
      role: "AGRONOMIST",
      active: true,
    },
  });

  const officer = await prisma.user.upsert({
    where: { email: "officer@agaate.local" },
    update: { name: "Ramesh Patel (Lead Farm Officer)", role: "FARM_OFFICER", active: true, passwordHash },
    create: {
      name: "Ramesh Patel (Lead Farm Officer)",
      email: "officer@agaate.local",
      passwordHash,
      role: "FARM_OFFICER",
      active: true,
    },
  });

  console.log("Users created:", {
    superAdmin: superAdmin.email,
    farmAdmin: farmAdmin.email,
    agronomist: agronomist.email,
    officer: officer.email,
  });

  // 2. Create Realistic Demo Farms
  const greenfieldFarm = await prisma.farm.upsert({
    where: { id: "farm-greenfield-01" },
    update: {
      name: "Greenfield Precision Estate",
      ownerName: "Somnath Agrotech Ltd",
      location: "Hosur, Tamil Nadu",
      address: "Survey No. 48/2, Denkanikottai Road, Hosur",
      latitude: 12.5284,
      longitude: 77.8341,
      totalArea: 15.5,
      cultivableArea: 13.0,
      waterSource: "2x 20HP Borewells + 200kL Rainwater Pond",
      geofenceRadiusMeters: 600,
      status: "ACTIVE",
    },
    create: {
      id: "farm-greenfield-01",
      name: "Greenfield Precision Estate",
      ownerName: "Somnath Agrotech Ltd",
      location: "Hosur, Tamil Nadu",
      address: "Survey No. 48/2, Denkanikottai Road, Hosur",
      latitude: 12.5284,
      longitude: 77.8341,
      totalArea: 15.5,
      cultivableArea: 13.0,
      waterSource: "2x 20HP Borewells + 200kL Rainwater Pond",
      geofenceRadiusMeters: 600,
      status: "ACTIVE",
    },
  });

  const valleyFarm = await prisma.farm.upsert({
    where: { id: "farm-valley-02" },
    update: {
      name: "Cauvery Valley Orchards",
      ownerName: "Narayana Swamy",
      location: "Mandya, Karnataka",
      address: "Village Srirangapatna Taluk, Mandya",
      latitude: 12.4181,
      longitude: 76.6947,
      totalArea: 25.0,
      cultivableArea: 22.5,
      waterSource: "Cauvery River Canal + Drip Station",
      geofenceRadiusMeters: 800,
      status: "ACTIVE",
    },
    create: {
      id: "farm-valley-02",
      name: "Cauvery Valley Orchards",
      ownerName: "Narayana Swamy",
      location: "Mandya, Karnataka",
      address: "Village Srirangapatna Taluk, Mandya",
      latitude: 12.4181,
      longitude: 76.6947,
      totalArea: 25.0,
      cultivableArea: 22.5,
      waterSource: "Cauvery River Canal + Drip Station",
      geofenceRadiusMeters: 800,
      status: "ACTIVE",
    },
  });

  const sunriseFarm = await prisma.farm.upsert({
    where: { id: "farm-sunrise-03" },
    update: {
      name: "Sunrise Organic Ventures",
      ownerName: "Priyanka Deshmukh",
      location: "Nashik, Maharashtra",
      address: "Gat No. 112, Dindori Road, Nashik",
      latitude: 20.011,
      longitude: 73.7903,
      totalArea: 8.0,
      cultivableArea: 6.5,
      waterSource: "Open Well + Solar Pump",
      geofenceRadiusMeters: 500,
      status: "SETUP",
    },
    create: {
      id: "farm-sunrise-03",
      name: "Sunrise Organic Ventures",
      ownerName: "Priyanka Deshmukh",
      location: "Nashik, Maharashtra",
      address: "Gat No. 112, Dindori Road, Nashik",
      latitude: 20.011,
      longitude: 73.7903,
      totalArea: 8.0,
      cultivableArea: 6.5,
      waterSource: "Open Well + Solar Pump",
      geofenceRadiusMeters: 500,
      status: "SETUP",
    },
  });

  // 3. Assign Farm Access
  const accessAssignments = [
    { userId: farmAdmin.id, farmId: greenfieldFarm.id, canManage: true },
    { userId: farmAdmin.id, farmId: valleyFarm.id, canManage: true },
    { userId: farmAdmin.id, farmId: sunriseFarm.id, canManage: true },
    { userId: agronomist.id, farmId: greenfieldFarm.id, canManage: false },
    { userId: agronomist.id, farmId: valleyFarm.id, canManage: false },
    { userId: agronomist.id, farmId: sunriseFarm.id, canManage: false },
    { userId: officer.id, farmId: greenfieldFarm.id, canManage: false },
    { userId: officer.id, farmId: valleyFarm.id, canManage: false },
  ];

  for (const a of accessAssignments) {
    await prisma.farmAccess.upsert({
      where: { userId_farmId: { userId: a.userId, farmId: a.farmId } },
      update: { canManage: a.canManage },
      create: a,
    });
  }

  // 4. Create Plots
  const plot1 = await prisma.plot.upsert({
    where: { id: "plot-gf-01" },
    update: {
      name: "Plot 1 - North Ridge",
      area: 4.5,
      latitude: 12.5286,
      longitude: 77.8343,
      soilType: "Red Sandy Loam (pH 6.8)",
      status: "ACTIVE",
    },
    create: {
      id: "plot-gf-01",
      farmId: greenfieldFarm.id,
      name: "Plot 1 - North Ridge",
      area: 4.5,
      latitude: 12.5286,
      longitude: 77.8343,
      soilType: "Red Sandy Loam (pH 6.8)",
      status: "ACTIVE",
    },
  });

  const plot2 = await prisma.plot.upsert({
    where: { id: "plot-gf-02" },
    update: {
      name: "Plot 2 - South Terrace",
      area: 3.5,
      latitude: 12.528,
      longitude: 77.8338,
      soilType: "Clay Loam with High Organic Carbon",
      status: "ACTIVE",
    },
    create: {
      id: "plot-gf-02",
      farmId: greenfieldFarm.id,
      name: "Plot 2 - South Terrace",
      area: 3.5,
      latitude: 12.528,
      longitude: 77.8338,
      soilType: "Clay Loam with High Organic Carbon",
      status: "ACTIVE",
    },
  });

  // Plot Irrigation
  await prisma.irrigationConfiguration.deleteMany({ where: { plotId: { in: [plot1.id, plot2.id] } } });
  await prisma.irrigationConfiguration.createMany({
    data: [
      { plotId: plot1.id, type: "Drip", details: "Inline dripper 2.0 LPH @ 40cm spacing" },
      { plotId: plot1.id, type: "Rain Pipe", details: "Overhead micro-sprinkler for humidity control" },
      { plotId: plot2.id, type: "Drip", details: "Heavy-duty 16mm drip lateral" },
    ],
  });

  // 5. Create Crop Cycles
  const today = new Date();
  const iso = (d: number) => {
    const dt = new Date(today);
    dt.setDate(dt.getDate() + d);
    return dt;
  };

  const cycle1 = await prisma.cropCycle.upsert({
    where: { id: "cycle-watermelon-01" },
    update: {
      cropName: "Watermelon (Icebox)",
      startDate: iso(-25),
      expectedFirstHarvestDate: iso(65),
      establishmentType: "NURSERY_TRANSPLANTATION",
      bedPreparationEnabled: true,
      bedWidthCm: 90,
      bedCenterDistanceCm: 150,
      expectedBedsPerAcre: 200,
      actualBedsCreated: 890,
      mulchEnabled: true,
      mulchHolePattern: "DOUBLE_LINE_ZIGZAG",
      plantDistanceCm: 45,
      expectedPlantsPerAcre: 6000,
      actualPlants: 26800,
      status: "ACTIVE",
    },
    create: {
      id: "cycle-watermelon-01",
      plotId: plot1.id,
      cropName: "Watermelon (Icebox)",
      startDate: iso(-25),
      expectedFirstHarvestDate: iso(65),
      establishmentType: "NURSERY_TRANSPLANTATION",
      bedPreparationEnabled: true,
      bedWidthCm: 90,
      bedCenterDistanceCm: 150,
      expectedBedsPerAcre: 200,
      actualBedsCreated: 890,
      mulchEnabled: true,
      mulchHolePattern: "DOUBLE_LINE_ZIGZAG",
      plantDistanceCm: 45,
      expectedPlantsPerAcre: 6000,
      actualPlants: 26800,
      status: "ACTIVE",
    },
  });

  // Varieties
  await prisma.cropVariety.deleteMany({ where: { cropCycleId: cycle1.id } });
  await prisma.cropVariety.createMany({
    data: [
      { cropCycleId: cycle1.id, name: "Arka Manik" },
      { cropCycleId: cycle1.id, name: "Black Magic (F1)" },
    ],
  });

  // Milestones
  await prisma.milestone.deleteMany({ where: { cropCycleId: cycle1.id } });
  await prisma.milestone.createMany({
    data: [
      {
        cropCycleId: cycle1.id,
        name: "Land Preparation",
        targetDate: iso(-25),
        status: "COMPLETED",
        completedAt: iso(-24),
      },
      {
        cropCycleId: cycle1.id,
        name: "Mulching & TP / Sowing Readiness",
        targetDate: iso(-18),
        status: "COMPLETED",
        completedAt: iso(-17),
      },
      {
        cropCycleId: cycle1.id,
        name: "Transplantation",
        targetDate: iso(-10),
        status: "COMPLETED",
        completedAt: iso(-9),
      },
      {
        cropCycleId: cycle1.id,
        name: "First Harvest",
        targetDate: iso(65),
        status: "PENDING",
      },
    ],
  });

  // 6. Create Tasks
  await prisma.task.deleteMany({ where: { farmId: greenfieldFarm.id } });
  await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot1.id,
      cropCycleId: cycle1.id,
      title: "Foliar Spray: Micronutrient Chelate + Bio-Stimulant",
      description: "Apply 2.5g/L Chelated Zinc & Boron with seaweed extract in early morning hours.",
      instructions: "Spray nozzle at 3.5 bar. Ensure full underside leaf coverage before 9:00 AM.",
      category: "FOLIAR_NUTRITION",
      priority: "HIGH",
      status: "IN_PROGRESS",
      origin: "AGRONOMIST",
      dueDate: iso(0),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot1.id,
      cropCycleId: cycle1.id,
      title: "Fertigation Schedule: NPK 12:61:00 (Mono Ammonium Phosphate)",
      description: "Inject 4 kg/acre MAP through venturi over 45-minute cycle.",
      instructions: "Check EC & pH of drain water after irrigation cycle.",
      category: "FERTIGATION",
      priority: "URGENT",
      status: "ASSIGNED",
      origin: "AGRONOMIST",
      dueDate: iso(0),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot1.id,
      cropCycleId: cycle1.id,
      title: "Daily Crop Health & Pest Monitoring",
      description: "Inspect 20 random vines across Plot 1 for red pumpkin beetle and leaf curl.",
      category: "CROP_MONITORING",
      priority: "MEDIUM",
      status: "AVAILABLE",
      origin: "DAILY_MONITORING",
      dueDate: iso(0),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  console.log("Seeding complete! Ready for all 4 hierarchy roles.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
