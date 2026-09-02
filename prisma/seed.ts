import bcrypt from "bcryptjs";
import { PrismaClient, Role, FarmStatus, PlotStatus, EstablishmentType, CropCycleStatus, MilestoneStatus, TaskOrigin, TaskStatus, AttendanceStatus, ApprovalStatus, HealthStatus, IncidentLevel, IncidentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding ultra-rich Agaate agricultural operations demo data...");

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

  const officer2 = await prisma.user.upsert({
    where: { email: "officer2@agaate.local" },
    update: { name: "Suresh Kumar (Field Officer - Mandya)", role: "FARM_OFFICER", active: true, passwordHash },
    create: {
      name: "Suresh Kumar (Field Officer - Mandya)",
      email: "officer2@agaate.local",
      passwordHash,
      role: "FARM_OFFICER",
      active: true,
    },
  });

  const officer3 = await prisma.user.upsert({
    where: { email: "officer3@agaate.local" },
    update: { name: "Pooja Deshmukh (Field Officer - Nashik)", role: "FARM_OFFICER", active: true, passwordHash },
    create: {
      name: "Pooja Deshmukh (Field Officer - Nashik)",
      email: "officer3@agaate.local",
      passwordHash,
      role: "FARM_OFFICER",
      active: true,
    },
  });

  console.log("Core users ready:", [superAdmin.email, farmAdmin.email, agronomist.email, officer.email, officer2.email]);

  // Helper date calculators
  const now = new Date();
  const dateOffset = (days: number, hour = 8, min = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(hour, min, 0, 0);
    return d;
  };
  const dateOnly = (days: number) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  // 2. Create 4 Distinct Agricultural Estates
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
      status: "ACTIVE" as FarmStatus,
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
      status: "ACTIVE" as FarmStatus,
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
      waterSource: "Cauvery River Canal + Drip Automation Station",
      geofenceRadiusMeters: 800,
      status: "ACTIVE" as FarmStatus,
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
      waterSource: "Cauvery River Canal + Drip Automation Station",
      geofenceRadiusMeters: 800,
      status: "ACTIVE" as FarmStatus,
    },
  });

  const sunriseFarm = await prisma.farm.upsert({
    where: { id: "farm-sunrise-03" },
    update: {
      name: "Sunrise Organic Vineyards",
      ownerName: "Priyanka Deshmukh",
      location: "Nashik, Maharashtra",
      address: "Gat No. 112, Dindori Road, Nashik",
      latitude: 20.011,
      longitude: 73.7903,
      totalArea: 8.0,
      cultivableArea: 6.5,
      waterSource: "Open Well + Solar Pump Automation",
      geofenceRadiusMeters: 500,
      status: "ACTIVE" as FarmStatus,
    },
    create: {
      id: "farm-sunrise-03",
      name: "Sunrise Organic Vineyards",
      ownerName: "Priyanka Deshmukh",
      location: "Nashik, Maharashtra",
      address: "Gat No. 112, Dindori Road, Nashik",
      latitude: 20.011,
      longitude: 73.7903,
      totalArea: 8.0,
      cultivableArea: 6.5,
      waterSource: "Open Well + Solar Pump Automation",
      geofenceRadiusMeters: 500,
      status: "ACTIVE" as FarmStatus,
    },
  });

  const deccanFarm = await prisma.farm.upsert({
    where: { id: "farm-deccan-04" },
    update: {
      name: "Deccan Plateau High-Tech Nursery",
      ownerName: "Dr. K. R. Soundarajan",
      location: "Dharmapuri, Tamil Nadu",
      address: "SF 210, Palacode Highway, Dharmapuri",
      latitude: 12.1211,
      longitude: 78.1582,
      totalArea: 12.0,
      cultivableArea: 10.0,
      waterSource: "Submersible Pump 15HP + Deep Borewell",
      geofenceRadiusMeters: 500,
      status: "SETUP" as FarmStatus,
    },
    create: {
      id: "farm-deccan-04",
      name: "Deccan Plateau High-Tech Nursery",
      ownerName: "Dr. K. R. Soundarajan",
      location: "Dharmapuri, Tamil Nadu",
      address: "SF 210, Palacode Highway, Dharmapuri",
      latitude: 12.1211,
      longitude: 78.1582,
      totalArea: 12.0,
      cultivableArea: 10.0,
      waterSource: "Submersible Pump 15HP + Deep Borewell",
      geofenceRadiusMeters: 500,
      status: "SETUP" as FarmStatus,
    },
  });

  // 3. Assign Multi-Estate Access
  const accessAssignments = [
    { userId: farmAdmin.id, farmId: greenfieldFarm.id, canManage: true },
    { userId: farmAdmin.id, farmId: valleyFarm.id, canManage: true },
    { userId: farmAdmin.id, farmId: sunriseFarm.id, canManage: true },
    { userId: farmAdmin.id, farmId: deccanFarm.id, canManage: true },
    { userId: agronomist.id, farmId: greenfieldFarm.id, canManage: false },
    { userId: agronomist.id, farmId: valleyFarm.id, canManage: false },
    { userId: agronomist.id, farmId: sunriseFarm.id, canManage: false },
    { userId: officer.id, farmId: greenfieldFarm.id, canManage: false },
    { userId: officer2.id, farmId: valleyFarm.id, canManage: false },
    { userId: officer3.id, farmId: sunriseFarm.id, canManage: false },
  ];

  for (const a of accessAssignments) {
    await prisma.farmAccess.upsert({
      where: { userId_farmId: { userId: a.userId, farmId: a.farmId } },
      update: { canManage: a.canManage },
      create: a,
    });
  }

  // 4. Create Plots with Varied Soil & Irrigation Configurations
  const plot1 = await prisma.plot.upsert({
    where: { id: "plot-gf-01" },
    update: {
      name: "Plot 1 - North Ridge",
      area: 4.5,
      latitude: 12.5286,
      longitude: 77.8343,
      soilType: "Red Sandy Loam (pH 6.8, EC 0.35 dS/m)",
      status: "ACTIVE" as PlotStatus,
    },
    create: {
      id: "plot-gf-01",
      farmId: greenfieldFarm.id,
      name: "Plot 1 - North Ridge",
      area: 4.5,
      latitude: 12.5286,
      longitude: 77.8343,
      soilType: "Red Sandy Loam (pH 6.8, EC 0.35 dS/m)",
      status: "ACTIVE" as PlotStatus,
    },
  });

  const plot2 = await prisma.plot.upsert({
    where: { id: "plot-gf-02" },
    update: {
      name: "Plot 2 - South Terrace",
      area: 3.5,
      latitude: 12.528,
      longitude: 77.8338,
      soilType: "Clay Loam with High Organic Carbon (1.2%)",
      status: "ACTIVE" as PlotStatus,
    },
    create: {
      id: "plot-gf-02",
      farmId: greenfieldFarm.id,
      name: "Plot 2 - South Terrace",
      area: 3.5,
      latitude: 12.528,
      longitude: 77.8338,
      soilType: "Clay Loam with High Organic Carbon (1.2%)",
      status: "ACTIVE" as PlotStatus,
    },
  });

  const plot3 = await prisma.plot.upsert({
    where: { id: "plot-gf-03" },
    update: {
      name: "Plot 3 - East Valley",
      area: 5.0,
      latitude: 12.5288,
      longitude: 77.8352,
      soilType: "Alluvial Red Soil with Drip Fertigation Bedding",
      status: "ACTIVE" as PlotStatus,
    },
    create: {
      id: "plot-gf-03",
      farmId: greenfieldFarm.id,
      name: "Plot 3 - East Valley",
      area: 5.0,
      latitude: 12.5288,
      longitude: 77.8352,
      soilType: "Alluvial Red Soil with Drip Fertigation Bedding",
      status: "ACTIVE" as PlotStatus,
    },
  });

  const plotValley1 = await prisma.plot.upsert({
    where: { id: "plot-val-01" },
    update: {
      name: "Plot A - Riverside Citrus Block",
      area: 12.0,
      latitude: 12.4185,
      longitude: 76.695,
      soilType: "Deep River Silt & Loam (pH 7.2)",
      status: "ACTIVE" as PlotStatus,
    },
    create: {
      id: "plot-val-01",
      farmId: valleyFarm.id,
      name: "Plot A - Riverside Citrus Block",
      area: 12.0,
      latitude: 12.4185,
      longitude: 76.695,
      soilType: "Deep River Silt & Loam (pH 7.2)",
      status: "ACTIVE" as PlotStatus,
    },
  });

  const plotSunrise1 = await prisma.plot.upsert({
    where: { id: "plot-sun-01" },
    update: {
      name: "Plot 1 - Vineyard North",
      area: 4.0,
      latitude: 20.0112,
      longitude: 73.7905,
      soilType: "Black Basaltic Loam with Gravel",
      status: "ACTIVE" as PlotStatus,
    },
    create: {
      id: "plot-sun-01",
      farmId: sunriseFarm.id,
      name: "Plot 1 - Vineyard North",
      area: 4.0,
      latitude: 20.0112,
      longitude: 73.7905,
      soilType: "Black Basaltic Loam with Gravel",
      status: "ACTIVE" as PlotStatus,
    },
  });

  // Plot Irrigation Configurations
  await prisma.irrigationConfiguration.deleteMany({
    where: { plotId: { in: [plot1.id, plot2.id, plot3.id, plotValley1.id, plotSunrise1.id] } },
  });
  await prisma.irrigationConfiguration.createMany({
    data: [
      { plotId: plot1.id, type: "Drip", details: "Inline dripper 2.0 LPH @ 40cm spacing, 16mm lateral" },
      { plotId: plot1.id, type: "Rain Pipe", details: "Overhead micro-sprinkler for micro-climate humidity control" },
      { plotId: plot2.id, type: "Drip", details: "Pressure compensating drippers 2.4 LPH @ 50cm" },
      { plotId: plot3.id, type: "Drip", details: "Double lateral drip line per bed (16mm heavy duty)" },
      { plotId: plotValley1.id, type: "Drip", details: "Automated sub-surface drip manifold with fertilizer venturi" },
      { plotId: plotValley1.id, type: "Micro Sprinkler", details: "Under-tree canopy cooling sprinklers" },
      { plotId: plotSunrise1.id, type: "Drip", details: "Trellised suspended drip line with anti-drain valves" },
    ],
  });

  // 5. Create Realistic Crop Cycles & Milestones
  const cycleWatermelon = await prisma.cropCycle.upsert({
    where: { id: "cycle-watermelon-01" },
    update: {
      cropName: "Watermelon (Icebox Variety)",
      startDate: dateOnly(-28),
      expectedFirstHarvestDate: dateOnly(62),
      establishmentType: "NURSERY_TRANSPLANTATION" as EstablishmentType,
      bedPreparationEnabled: true,
      bedWidthCm: 90,
      bedCenterDistanceCm: 150,
      expectedBedsPerAcre: 200,
      actualBedsCreated: 890,
      mulchEnabled: true,
      mulchHolePattern: "DOUBLE_LINE_ZIGZAG",
      plantDistanceCm: 45,
      expectedPlantsPerAcre: 6000,
      expectedPlants: 27000,
      actualPlants: 26800,
      status: "ACTIVE" as CropCycleStatus,
    },
    create: {
      id: "cycle-watermelon-01",
      plotId: plot1.id,
      cropName: "Watermelon (Icebox Variety)",
      startDate: dateOnly(-28),
      expectedFirstHarvestDate: dateOnly(62),
      establishmentType: "NURSERY_TRANSPLANTATION" as EstablishmentType,
      bedPreparationEnabled: true,
      bedWidthCm: 90,
      bedCenterDistanceCm: 150,
      expectedBedsPerAcre: 200,
      actualBedsCreated: 890,
      mulchEnabled: true,
      mulchHolePattern: "DOUBLE_LINE_ZIGZAG",
      plantDistanceCm: 45,
      expectedPlantsPerAcre: 6000,
      expectedPlants: 27000,
      actualPlants: 26800,
      status: "ACTIVE" as CropCycleStatus,
    },
  });

  const cycleCapsicum = await prisma.cropCycle.upsert({
    where: { id: "cycle-capsicum-02" },
    update: {
      cropName: "Color Bell Pepper / Capsicum (Indra F1)",
      startDate: dateOnly(-45),
      expectedFirstHarvestDate: dateOnly(35),
      establishmentType: "NURSERY_TRANSPLANTATION" as EstablishmentType,
      bedPreparationEnabled: true,
      bedWidthCm: 80,
      bedCenterDistanceCm: 140,
      expectedBedsPerAcre: 220,
      actualBedsCreated: 760,
      mulchEnabled: true,
      mulchHolePattern: "DOUBLE_LINE_ZIGZAG",
      plantDistanceCm: 40,
      expectedPlantsPerAcre: 7200,
      expectedPlants: 25200,
      actualPlants: 25000,
      status: "ACTIVE" as CropCycleStatus,
    },
    create: {
      id: "cycle-capsicum-02",
      plotId: plot2.id,
      cropName: "Color Bell Pepper / Capsicum (Indra F1)",
      startDate: dateOnly(-45),
      expectedFirstHarvestDate: dateOnly(35),
      establishmentType: "NURSERY_TRANSPLANTATION" as EstablishmentType,
      bedPreparationEnabled: true,
      bedWidthCm: 80,
      bedCenterDistanceCm: 140,
      expectedBedsPerAcre: 220,
      actualBedsCreated: 760,
      mulchEnabled: true,
      mulchHolePattern: "DOUBLE_LINE_ZIGZAG",
      plantDistanceCm: 40,
      expectedPlantsPerAcre: 7200,
      expectedPlants: 25200,
      actualPlants: 25000,
      status: "ACTIVE" as CropCycleStatus,
    },
  });

  const cycleCucumber = await prisma.cropCycle.upsert({
    where: { id: "cycle-cucumber-03" },
    update: {
      cropName: "English Greenhouse Cucumber (Kian F1)",
      startDate: dateOnly(-14),
      expectedFirstHarvestDate: dateOnly(28),
      establishmentType: "DIRECT_SOWING" as EstablishmentType,
      bedPreparationEnabled: true,
      bedWidthCm: 75,
      bedCenterDistanceCm: 130,
      expectedBedsPerAcre: 240,
      actualBedsCreated: 1180,
      mulchEnabled: true,
      mulchHolePattern: "SINGLE_LINE",
      plantDistanceCm: 30,
      expectedPlantsPerAcre: 8500,
      expectedPlants: 42500,
      actualPlants: 42000,
      status: "ACTIVE" as CropCycleStatus,
    },
    create: {
      id: "cycle-cucumber-03",
      plotId: plot3.id,
      cropName: "English Greenhouse Cucumber (Kian F1)",
      startDate: dateOnly(-14),
      expectedFirstHarvestDate: dateOnly(28),
      establishmentType: "DIRECT_SOWING" as EstablishmentType,
      bedPreparationEnabled: true,
      bedWidthCm: 75,
      bedCenterDistanceCm: 130,
      expectedBedsPerAcre: 240,
      actualBedsCreated: 1180,
      mulchEnabled: true,
      mulchHolePattern: "SINGLE_LINE",
      plantDistanceCm: 30,
      expectedPlantsPerAcre: 8500,
      expectedPlants: 42500,
      actualPlants: 42000,
      status: "ACTIVE" as CropCycleStatus,
    },
  });

  // Crop Varieties
  await prisma.cropVariety.deleteMany({
    where: { cropCycleId: { in: [cycleWatermelon.id, cycleCapsicum.id, cycleCucumber.id] } },
  });
  await prisma.cropVariety.createMany({
    data: [
      { cropCycleId: cycleWatermelon.id, name: "Arka Manik (High Sugar)" },
      { cropCycleId: cycleWatermelon.id, name: "Black Magic F1" },
      { cropCycleId: cycleCapsicum.id, name: "Indra Red F1" },
      { cropCycleId: cycleCapsicum.id, name: "Bachata Yellow F1" },
      { cropCycleId: cycleCucumber.id, name: "Kian Parthenocarpic F1" },
    ],
  });

  // Milestones
  await prisma.milestone.deleteMany({
    where: { cropCycleId: { in: [cycleWatermelon.id, cycleCapsicum.id, cycleCucumber.id] } },
  });
  await prisma.milestone.createMany({
    data: [
      // Watermelon Milestones
      { cropCycleId: cycleWatermelon.id, name: "Land Tillage & Basal Fertilizer Application", targetDate: dateOnly(-28), status: "COMPLETED" as MilestoneStatus, completedAt: dateOffset(-27) },
      { cropCycleId: cycleWatermelon.id, name: "Raised Bed Formation & Drip Laying", targetDate: dateOnly(-24), status: "COMPLETED" as MilestoneStatus, completedAt: dateOffset(-23) },
      { cropCycleId: cycleWatermelon.id, name: "Silver-Black Mulch Film Laying & Punching", targetDate: dateOnly(-20), status: "COMPLETED" as MilestoneStatus, completedAt: dateOffset(-19) },
      { cropCycleId: cycleWatermelon.id, name: "Nursery Seedling Transplantation (25-day old)", targetDate: dateOnly(-15), status: "COMPLETED" as MilestoneStatus, completedAt: dateOffset(-14) },
      { cropCycleId: cycleWatermelon.id, name: "First Vine Training & Lateral Pruning", targetDate: dateOnly(5), status: "PENDING" as MilestoneStatus },
      { cropCycleId: cycleWatermelon.id, name: "Peak Flowering & Bee Pollination Window", targetDate: dateOnly(20), status: "PENDING" as MilestoneStatus },
      { cropCycleId: cycleWatermelon.id, name: "First Commercial Harvest", targetDate: dateOnly(62), status: "PENDING" as MilestoneStatus },

      // Capsicum Milestones
      { cropCycleId: cycleCapsicum.id, name: "Basal Manuring (Vermicompost + Neem Cake)", targetDate: dateOnly(-45), status: "COMPLETED" as MilestoneStatus, completedAt: dateOffset(-44) },
      { cropCycleId: cycleCapsicum.id, name: "Transplantation & Starter Fertigation (19:19:19)", targetDate: dateOnly(-40), status: "COMPLETED" as MilestoneStatus, completedAt: dateOffset(-39) },
      { cropCycleId: cycleCapsicum.id, name: "Trellising & 4-Stem Pruning Setup", targetDate: dateOnly(-20), status: "COMPLETED" as MilestoneStatus, completedAt: dateOffset(-18) },
      { cropCycleId: cycleCapsicum.id, name: "Mid-Season Calcium Nitrate & Boron Injection", targetDate: dateOnly(2), status: "PENDING" as MilestoneStatus },
      { cropCycleId: cycleCapsicum.id, name: "First Color Break Harvesting", targetDate: dateOnly(35), status: "PENDING" as MilestoneStatus },

      // Cucumber Milestones
      { cropCycleId: cycleCucumber.id, name: "Direct Seed Sowing & Drip Germination Soak", targetDate: dateOnly(-14), status: "COMPLETED" as MilestoneStatus, completedAt: dateOffset(-13) },
      { cropCycleId: cycleCucumber.id, name: "Vertical Trellis Wire Clip Attachment", targetDate: dateOnly(-5), status: "COMPLETED" as MilestoneStatus, completedAt: dateOffset(-4) },
      { cropCycleId: cycleCucumber.id, name: "First Continuous Flush Harvest", targetDate: dateOnly(28), status: "PENDING" as MilestoneStatus },
    ],
  });

  // 6. Agronomy Plans with Micro-Climate Overrides
  await prisma.agronomyPlan.deleteMany({
    where: { farmId: { in: [greenfieldFarm.id, valleyFarm.id, sunriseFarm.id] } },
  });

  const planToday = await prisma.agronomyPlan.create({
    data: {
      farmId: greenfieldFarm.id,
      planDate: dateOnly(0),
      notes: "High morning solar radiation expected. Shift fertigation injection cycle to 07:30 AM before rootzone temperature exceeds 28°C.",
      manualTemperature: 31.5,
      manualHumidity: 65.0,
      manualWindSpeed: 14.2,
      manualRainForecast: 20.0,
      manualWeatherRemarks: "Morning humidity favor early powdery mildew check. Dew evaporated by 08:30 AM.",
      createdById: agronomist.id,
    },
  });

  const planYesterday = await prisma.agronomyPlan.create({
    data: {
      farmId: greenfieldFarm.id,
      planDate: dateOnly(-1),
      notes: "Post-irrigation EC recorded at 1.4 dS/m. Normal range.",
      manualTemperature: 30.2,
      manualHumidity: 68.0,
      manualWindSpeed: 11.5,
      manualRainForecast: 10.0,
      manualWeatherRemarks: "Clear sky with mild afternoon gusts.",
      createdById: agronomist.id,
    },
  });

  // 7. Full 7-Day Rolling Agronomy Task Matrix
  await prisma.task.deleteMany({
    where: { farmId: { in: [greenfieldFarm.id, valleyFarm.id, sunriseFarm.id] } },
  });

  // Historical Completed Tasks (-2 Days)
  const taskPast2 = await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot1.id,
      cropCycleId: cycleWatermelon.id,
      title: "Basal Fertigation: 19:19:19 (Polyfeed) + Micronutrients",
      description: "Inject 5 kg/acre water soluble NPK 19:19:19 with 250g Chelated Zinc EDTA via Venturi.",
      instructions: "Operate at 2.2 bar mainline pressure. Run 15-min pre-flush before chemical injection.",
      category: "FERTIGATION",
      priority: "HIGH",
      status: "COMPLETED" as TaskStatus,
      origin: "AGRONOMIST" as TaskOrigin,
      dueDate: dateOnly(-2),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  const execPast2 = await prisma.taskExecution.create({
    data: {
      taskId: taskPast2.id,
      officerId: officer.id,
      status: "COMPLETED" as TaskStatus,
      startedAt: dateOffset(-2, 7, 30),
      completedAt: dateOffset(-2, 10, 0),
      remarks: "Applied 5.0 kg 19:19:19 across entire Plot 1. Mainline filter cleared of fine sand before cycle.",
    },
  });

  await prisma.materialUsage.createMany({
    data: [
      { executionId: execPast2.id, materialName: "Water Soluble NPK 19:19:19", quantity: 5.0, unit: "kg" },
      { executionId: execPast2.id, materialName: "Chelated Zinc (Zn-EDTA 12%)", quantity: 0.25, unit: "kg" },
    ],
  });

  await prisma.labourUsage.create({
    data: { executionId: execPast2.id, labourers: 2, hours: 2.5, labourHours: 5.0 },
  });

  // Historical Completed Task (-1 Day)
  const taskPast1 = await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot2.id,
      cropCycleId: cycleCapsicum.id,
      planId: planYesterday.id,
      title: "Preventive Bio-Pesticide Spray: Neem Oil 10,000 PPM + Sticky Trap Audit",
      description: "Spray 3.0 ml/L Cold Pressed Neem Oil emulsified with bio-wetting agent.",
      instructions: "Cover both upper and lower leaf surface. Check yellow sticky trap count for thrips density.",
      category: "SPRAYING",
      priority: "MEDIUM",
      status: "COMPLETED" as TaskStatus,
      origin: "AGRONOMIST" as TaskOrigin,
      dueDate: dateOnly(-1),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  const execPast1 = await prisma.taskExecution.create({
    data: {
      taskId: taskPast1.id,
      officerId: officer.id,
      status: "COMPLETED" as TaskStatus,
      startedAt: dateOffset(-1, 8, 0),
      completedAt: dateOffset(-1, 11, 30),
      remarks: "Complete canopy coverage achieved. Installed 30 new yellow sticky traps across South Terrace.",
    },
  });

  await prisma.materialUsage.createMany({
    data: [
      { executionId: execPast1.id, materialName: "Cold Pressed Neem Oil (10,000 PPM)", quantity: 0.5, unit: "L" },
      { executionId: execPast1.id, materialName: "Bio-Wetting Sticker Agent", quantity: 0.1, unit: "L" },
      { executionId: execPast1.id, materialName: "Yellow Sticky Insect Traps", quantity: 30.0, unit: "pcs" },
    ],
  });

  await prisma.labourUsage.create({
    data: { executionId: execPast1.id, labourers: 3, hours: 3.5, labourHours: 10.5 },
  });

  // TODAY'S TASKS (Day 0) - Active Work Queue
  await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot1.id,
      cropCycleId: cycleWatermelon.id,
      planId: planToday.id,
      title: "Morning Fertigation: 12:61:00 Mono Ammonium Phosphate (MAP) + Humic Acid",
      description: "Inject 4.5 kg/acre MAP with 500ml liquid humic acid (12%) through venturi unit over 45 minutes.",
      instructions: "Check EC & pH of drain dripper water. Target EC: 1.4 dS/m, target pH: 6.2.",
      category: "FERTIGATION",
      priority: "URGENT",
      status: "IN_PROGRESS" as TaskStatus,
      origin: "AGRONOMIST" as TaskOrigin,
      dueDate: dateOnly(0),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot2.id,
      cropCycleId: cycleCapsicum.id,
      planId: planToday.id,
      title: "Foliar Spray: Calcium Boron Chelate & Seaweed Extract",
      description: "Apply 2.5 ml/L liquid calcium-boron with 1.5 ml/L Ascophyllum Nodosum extract.",
      instructions: "Spray before 10:00 AM. Calibrate boom nozzle pressure to 3.5 bar.",
      category: "FOLIAR_NUTRITION",
      priority: "HIGH",
      status: "ASSIGNED" as TaskStatus,
      origin: "AGRONOMIST" as TaskOrigin,
      dueDate: dateOnly(0),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot3.id,
      cropCycleId: cycleCucumber.id,
      planId: planToday.id,
      title: "Daily Crop Health & Pest Scouting (Plot 3 East Valley)",
      description: "Inspect 30 random plants for powdery mildew spots on bottom leaves and aphid colonies.",
      instructions: "Record photo signals in mobile console if disease severity exceeds 5%.",
      category: "CROP_MONITORING",
      priority: "MEDIUM",
      status: "AVAILABLE" as TaskStatus,
      origin: "DAILY_MONITORING" as TaskOrigin,
      dueDate: dateOnly(0),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot2.id,
      cropCycleId: cycleCapsicum.id,
      title: "Support Activity: Trellis Wire Tightening & Vine Clip Attachment",
      description: "Reinforce vertical support nylon twine for 4-stem capsicum canopy to prevent lodging under fruit load.",
      category: "SUPPORT_ACTIVITY",
      priority: "MEDIUM",
      status: "ASSIGNED" as TaskStatus,
      origin: "AGRONOMIST" as TaskOrigin,
      dueDate: dateOnly(0),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  // Cauvery Valley Farm Tasks for Today
  await prisma.task.create({
    data: {
      farmId: valleyFarm.id,
      plotId: plotValley1.id,
      title: "Canopy Irrigation & Sand Media Filter Backwash",
      description: "Perform 15-minute high pressure sand filter backwash and run 90-minute sub-surface drip cycle.",
      category: "IRRIGATION",
      priority: "HIGH",
      status: "ASSIGNED" as TaskStatus,
      origin: "AGRONOMIST" as TaskOrigin,
      dueDate: dateOnly(0),
      createdById: agronomist.id,
      assignedOfficerId: officer2.id,
    },
  });

  // FUTURE DISPATCH TASKS (+1 to +4 Days)
  await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot1.id,
      cropCycleId: cycleWatermelon.id,
      title: "Foliar Spray: Potassium Silicate (Armor-K) for Thermal Stress Protection",
      description: "Apply 2.0 g/L Potassium Silicate to strengthen epidermal cell walls against midday heat.",
      category: "FOLIAR_NUTRITION",
      priority: "HIGH",
      status: "ASSIGNED" as TaskStatus,
      origin: "AGRONOMIST" as TaskOrigin,
      dueDate: dateOnly(1),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot2.id,
      cropCycleId: cycleCapsicum.id,
      title: "Soil Drench: Trichoderma Viride + Pseudomonas Fluorescens",
      description: "Apply 2.0 kg/acre biocontrol drench via venturi to protect rootzone against Phytophthora rot.",
      category: "BIO_CONTROL",
      priority: "MEDIUM",
      status: "ASSIGNED" as TaskStatus,
      origin: "AGRONOMIST" as TaskOrigin,
      dueDate: dateOnly(2),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot1.id,
      cropCycleId: cycleWatermelon.id,
      title: "Fertigation Boost: 00:00:50 Potassium Sulphate (SOP) + Magnesium Sulphate",
      description: "Inject 6.0 kg/acre SOP with 2.5 kg/acre Epsom salt during vegetative surge.",
      category: "FERTIGATION",
      priority: "HIGH",
      status: "ASSIGNED" as TaskStatus,
      origin: "AGRONOMIST" as TaskOrigin,
      dueDate: dateOnly(3),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  await prisma.task.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot3.id,
      cropCycleId: cycleCucumber.id,
      title: "Inter-Row Manual Weeding & Drip Line Alignment Inspection",
      description: "Clear emerging broadleaf weeds along bed shoulders and ensure dripper emitter alignment.",
      category: "WEEDING",
      priority: "LOW",
      status: "ASSIGNED" as TaskStatus,
      origin: "AGRONOMIST" as TaskOrigin,
      dueDate: dateOnly(4),
      createdById: agronomist.id,
      assignedOfficerId: officer.id,
    },
  });

  // 8. Realistic Incidents with Actionable Follow-up Plans
  await prisma.incident.deleteMany({
    where: { farmId: { in: [greenfieldFarm.id, valleyFarm.id, sunriseFarm.id] } },
  });

  const incident1 = await prisma.incident.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot1.id,
      cropCycleId: cycleWatermelon.id,
      reporterId: officer.id,
      level: "PLOT" as IncidentLevel,
      type: "PEST_OUTBREAK",
      description: "Thrips (Thrips tabaci) infestation detected on Plot 1 North Ridge. Leaf curling and silvering visible on 15% of vine shoot tips.",
      severity: "HIGH",
      impactPercent: 12.5,
      status: "OPEN" as IncidentStatus,
      createdAt: dateOffset(-1, 14, 20),
    },
  });

  await prisma.incidentFollowUp.createMany({
    data: [
      {
        incidentId: incident1.id,
        authorId: agronomist.id,
        action: "Agronomist Prescription Dispatched",
        remarks: "Prescribed immediate application of 5% Cold Pressed Neem Oil wash and blue sticky traps. Targeted Bio-insecticide (Spinosad) scheduled.",
        createdAt: dateOffset(-1, 16, 0),
      },
      {
        incidentId: incident1.id,
        authorId: officer.id,
        action: "Physical Traps Installed",
        remarks: "Installed 25 yellow & blue sticky sheets across affected rows 4 to 12. Monitoring trap density twice daily.",
        createdAt: dateOffset(0, 7, 45),
      },
    ],
  });

  const incident2 = await prisma.incident.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plot2.id,
      cropCycleId: cycleCapsicum.id,
      reporterId: officer.id,
      level: "PLOT" as IncidentLevel,
      type: "EQUIPMENT_FAILURE",
      description: "Submain 2 manifold pressure release valve gasket cracked, causing localized water ponding and 0.4 bar pressure loss.",
      severity: "MEDIUM",
      impactPercent: 4.0,
      status: "ACKNOWLEDGED" as IncidentStatus,
      createdAt: dateOffset(-2, 11, 15),
    },
  });

  await prisma.incidentFollowUp.create({
    data: {
      incidentId: incident2.id,
      authorId: farmAdmin.id,
      action: "Plumbing Repair Dispatched",
      remarks: "Procured 2-inch CPVC valve assembly from Hosur spare depot. Maintenance technician on site replacing gasket.",
      createdAt: dateOffset(-1, 9, 30),
    },
  });

  const incident3 = await prisma.incident.create({
    data: {
      farmId: valleyFarm.id,
      plotId: plotValley1.id,
      reporterId: officer2.id,
      level: "FARM" as IncidentLevel,
      type: "POSITIVE_SIGNAL",
      description: "High brix potential (11.5° Bx) and uniform bloom setting observed across 12-acre citrus block following fertigation cycle.",
      severity: "LOW",
      impactPercent: 0.0,
      status: "RESOLVED" as IncidentStatus,
      createdAt: dateOffset(-3, 16, 45),
    },
  });

  await prisma.incidentFollowUp.create({
    data: {
      incidentId: incident3.id,
      authorId: agronomist.id,
      action: "Agronomy Benchmark Recorded",
      remarks: "Nutrient protocol validated for commercial scaling across Cauvery Valley orchards.",
      createdAt: dateOffset(-2, 10, 0),
    },
  });

  // 9. Crop Monitoring Signals & Field Telemetry
  await prisma.cropMonitoring.deleteMany({
    where: { farmId: { in: [greenfieldFarm.id, valleyFarm.id, sunriseFarm.id] } },
  });

  await prisma.cropMonitoring.createMany({
    data: [
      {
        farmId: greenfieldFarm.id,
        plotId: plot1.id,
        cropCycleId: cycleWatermelon.id,
        officerId: officer.id,
        status: "POOR" as HealthStatus,
        stage: "VEGETATIVE_BRANCHING",
        impactPercent: 12.0,
        remarks: "Shoot tip silvering from thrips pressure. Interveinal chlorosis under control post-iron chelate.",
        createdAt: dateOffset(-1, 14, 0),
      },
      {
        farmId: greenfieldFarm.id,
        plotId: plot2.id,
        cropCycleId: cycleCapsicum.id,
        officerId: officer.id,
        status: "GOOD" as HealthStatus,
        stage: "FLOWERING_AND_FRUIT_SET",
        impactPercent: 0.0,
        remarks: "Uniform dark green foliage, healthy node elongation, flower drop below 2%.",
        createdAt: dateOffset(-1, 15, 30),
      },
      {
        farmId: greenfieldFarm.id,
        plotId: plot3.id,
        cropCycleId: cycleCucumber.id,
        officerId: officer.id,
        status: "GOOD" as HealthStatus,
        stage: "EARLY_VEGETATIVE",
        impactPercent: 0.0,
        remarks: "100% direct seed germination, first true leaf emergence vigorous across all beds.",
        createdAt: dateOffset(0, 8, 15),
      },
      {
        farmId: valleyFarm.id,
        plotId: plotValley1.id,
        cropCycleId: cycleWatermelon.id,
        officerId: officer2.id,
        status: "GOOD" as HealthStatus,
        stage: "FRUIT_DEVELOPMENT",
        impactPercent: 0.0,
        remarks: "Canopy lush, high photosynthetic activity recorded on chlorophyll SPAD meter (48.5).",
        createdAt: dateOffset(-2, 11, 0),
      },
    ],
  });

  // 10. Verified Field Attendance & Governance Exception Queues
  await prisma.attendance.deleteMany({
    where: { farmId: { in: [greenfieldFarm.id, valleyFarm.id, sunriseFarm.id] } },
  });

  // Ramesh Patel Active Attendance Today
  const attendanceToday = await prisma.attendance.create({
    data: {
      userId: officer.id,
      farmId: greenfieldFarm.id,
      attendanceDate: dateOnly(0),
      status: "OPEN" as AttendanceStatus,
      startAt: dateOffset(0, 7, 15),
      startLatitude: 12.5284,
      startLongitude: 77.8341,
    },
  });

  // Historical Verified Attendance for Ramesh (Past 3 Days)
  await prisma.attendance.createMany({
    data: [
      {
        userId: officer.id,
        farmId: greenfieldFarm.id,
        attendanceDate: dateOnly(-1),
        status: "COMPLETED" as AttendanceStatus,
        startAt: dateOffset(-1, 7, 30),
        endAt: dateOffset(-1, 16, 45),
        startLatitude: 12.5285,
        startLongitude: 77.8342,
        endLatitude: 12.5283,
        endLongitude: 77.834,
      },
      {
        userId: officer.id,
        farmId: greenfieldFarm.id,
        attendanceDate: dateOnly(-2),
        status: "COMPLETED" as AttendanceStatus,
        startAt: dateOffset(-2, 7, 20),
        endAt: dateOffset(-2, 17, 0),
        startLatitude: 12.5284,
        startLongitude: 77.8341,
        endLatitude: 12.5284,
        endLongitude: 77.8341,
      },
      {
        userId: officer.id,
        farmId: greenfieldFarm.id,
        attendanceDate: dateOnly(-3),
        status: "COMPLETED" as AttendanceStatus,
        startAt: dateOffset(-3, 7, 40),
        endAt: dateOffset(-3, 16, 30),
        startLatitude: 12.5283,
        startLongitude: 77.8343,
        endLatitude: 12.5282,
        endLongitude: 77.8342,
      },
    ],
  });

  // Attendance Exception for Approvals Queue Demo
  const exceptionAttendance = await prisma.attendance.create({
    data: {
      userId: officer.id,
      farmId: greenfieldFarm.id,
      attendanceDate: dateOnly(-4),
      status: "EXCEPTION_PENDING" as AttendanceStatus,
      startAt: dateOffset(-4, 8, 10),
      startLatitude: 12.536, // ~850m outside geofence boundary
      startLongitude: 77.841,
      exceptionReason: "Main canal road under heavy mud-dredging. Parked farm utility vehicle at East electrical sub-station.",
    },
  });

  await prisma.attendanceException.create({
    data: {
      attendanceId: exceptionAttendance.id,
      distanceMeters: 850.0,
      reason: "Main canal road under heavy mud-dredging. Parked farm utility vehicle at East electrical sub-station.",
      status: "PENDING" as ApprovalStatus,
    },
  });

  // 11. Location Change Request for Governance Approvals Queue
  await prisma.locationChangeRequest.deleteMany({
    where: { farmId: { in: [greenfieldFarm.id, valleyFarm.id] } },
  });

  await prisma.locationChangeRequest.create({
    data: {
      farmId: valleyFarm.id,
      requesterId: farmAdmin.id,
      proposedLatitude: 12.4195,
      proposedLongitude: 76.6962,
      reason: "Estate entrance and solar automated pump station relocated to North gate boundary following canal levee expansion.",
      status: "PENDING" as ApprovalStatus,
      createdAt: dateOffset(-1, 10, 30),
    },
  });

  // 12. Audit Trail
  await prisma.auditLog.deleteMany({});
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: superAdmin.id,
        action: "ESTATE_ACTIVATION",
        entityType: "Farm",
        entityId: greenfieldFarm.id,
        metadata: { name: greenfieldFarm.name, totalArea: "15.5" },
        createdAt: dateOffset(-30, 9, 0),
      },
      {
        actorId: agronomist.id,
        action: "CROP_CYCLE_CREATED",
        entityType: "CropCycle",
        entityId: cycleWatermelon.id,
        metadata: { cropName: "Watermelon (Icebox)", plotId: plot1.id },
        createdAt: dateOffset(-28, 10, 30),
      },
      {
        actorId: farmAdmin.id,
        action: "TASK_GENERATION",
        entityType: "Task",
        entityId: taskPast1.id,
        metadata: { count: 6, origin: "7_DAY_DISPATCH" },
        createdAt: dateOffset(-2, 6, 0),
      },
      {
        actorId: officer.id,
        action: "INCIDENT_REPORTED",
        entityType: "Incident",
        entityId: incident1.id,
        metadata: { severity: "HIGH", type: "PEST_OUTBREAK" },
        createdAt: dateOffset(-1, 14, 20),
      },
      {
        actorId: superAdmin.id,
        action: "LOGIN",
        entityType: "User",
        entityId: superAdmin.id,
        metadata: { ip: "127.0.0.1", role: "SUPER_ADMIN" },
        createdAt: dateOffset(0, 7, 0),
      },
    ],
  });

  console.log("Ultra-rich seeding complete! All 4 estates, crop cycles, task matrix, incidents, attendance, and governance queues are populated.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
