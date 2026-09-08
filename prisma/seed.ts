import bcrypt from "bcryptjs";
import {
  PrismaClient,
  Role,
  FarmStatus,
  PlotStatus,
  EstablishmentType,
  CropCycleStatus,
  MilestoneStatus,
  TaskOrigin,
  TaskStatus,
  AttendanceStatus,
  ApprovalStatus,
  HealthStatus,
  IncidentLevel,
  IncidentStatus,
  MediaKind,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("==========================================================");
  console.log("🌱 AGAATE PRECISION AGROTECH — PRODUCTION DEMO SEED ENGINE");
  console.log("==========================================================");

  // -------------------------------------------------------------------------
  // STEP 1: CLEAN SLATE WIPE (Remove all legacy and test slop data)
  // -------------------------------------------------------------------------
  console.log("\n[1/7] Wiping all existing database records...");
  await prisma.auditLog.deleteMany({});
  await prisma.mediaAsset.deleteMany({});
  await prisma.materialUsage.deleteMany({});
  await prisma.labourUsage.deleteMany({});
  await prisma.taskExecution.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.incidentFollowUp.deleteMany({});
  await prisma.incident.deleteMany({});
  await prisma.cropMonitoring.deleteMany({});
  await prisma.locationChangeRequest.deleteMany({});
  await prisma.attendanceException.deleteMany({});
  await prisma.attendance.deleteMany({});
  await prisma.agronomyPlan.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.cropVariety.deleteMany({});
  await prisma.cropCycle.deleteMany({});
  await prisma.irrigationConfiguration.deleteMany({});
  await prisma.plot.deleteMany({});
  await prisma.farmAccess.deleteMany({});
  await prisma.farm.deleteMany({});
  await prisma.user.deleteMany({});
  console.log("✓ Database cleanly wiped.");

  // Helper date generators (relative to execution time so the demo is always fresh today)
  const now = new Date();
  const dateOffset = (days: number, hour = 8, min = 0) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + days);
    d.setUTCHours(hour, min, 0, 0);
    return d;
  };
  const dateOnly = (days: number) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() + days);
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  };

  const defaultPassword = process.env.INITIAL_ADMIN_PASSWORD || "LocalAdminPassword-ChangeMe-123";
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  // -------------------------------------------------------------------------
  // STEP 2: CORE HIERARCHY USERS (All 4 Distinct User Roles)
  // -------------------------------------------------------------------------
  console.log("\n[2/7] Seeding core users across all 4 operational tiers...");

  const superAdmin = await prisma.user.create({
    data: {
      id: "user-superadmin-01",
      name: "Arjun Singhania (Global Operations Director)",
      email: "admin@agaate.local",
      passwordHash,
      role: Role.SUPER_ADMIN,
      active: true,
    },
  });

  const farmAdmin = await prisma.user.create({
    data: {
      id: "user-farmadmin-02",
      name: "Vikram Mehta (Estate Operations Manager)",
      email: "farmadmin@agaate.local",
      passwordHash,
      role: Role.FARM_ADMIN,
      active: true,
    },
  });

  const agronomist = await prisma.user.create({
    data: {
      id: "user-agronomist-03",
      name: "Dr. Ananya Rao (Chief Agronomist & Soil Scientist)",
      email: "agronomist@agaate.local",
      passwordHash,
      role: Role.AGRONOMIST,
      active: true,
    },
  });

  const officer1 = await prisma.user.create({
    data: {
      id: "user-officer-04",
      name: "Ramesh Patel (Lead Field Officer - Hosur)",
      email: "officer@agaate.local",
      passwordHash,
      role: Role.FARM_OFFICER,
      active: true,
    },
  });

  const officer2 = await prisma.user.create({
    data: {
      id: "user-officer-05",
      name: "Suresh Kumar (Field Officer - Mandya)",
      email: "officer2@agaate.local",
      passwordHash,
      role: Role.FARM_OFFICER,
      active: true,
    },
  });

  const officer3 = await prisma.user.create({
    data: {
      id: "user-officer-06",
      name: "Pooja Deshmukh (Vineyard Officer - Nashik)",
      email: "officer3@agaate.local",
      passwordHash,
      role: Role.FARM_OFFICER,
      active: true,
    },
  });

  console.log("✓ 6 Core users created (Password: LocalAdminPassword-ChangeMe-123).");

  // -------------------------------------------------------------------------
  // STEP 3: ESTATES PORTFOLIO (Active, Setup Wizard, Inactive)
  // -------------------------------------------------------------------------
  console.log("\n[3/7] Seeding 5 distinct agricultural estates across India...");

  // Estate 1: Greenfield Precision Estate (Hosur, Tamil Nadu) - ACTIVE High-Tech Polyhouse
  const greenfieldFarm = await prisma.farm.create({
    data: {
      id: "farm-greenfield-01",
      name: "Greenfield Precision Estate",
      ownerName: "Somnath Agrotech Ltd",
      location: "Hosur, Tamil Nadu",
      address: "Survey No. 48/2, Denkanikottai Road, Hosur",
      latitude: 12.5284,
      longitude: 77.8341,
      totalArea: 16.0,
      cultivableArea: 14.5,
      waterSource: "2x 20HP Borewells + 250kL Rainwater Harvesting Pond",
      geofenceRadiusMeters: 600,
      status: FarmStatus.ACTIVE,
    },
  });

  // Estate 2: Cauvery Valley Orchards (Mandya, Karnataka) - ACTIVE River Canal Fruit Orchard
  const valleyFarm = await prisma.farm.create({
    data: {
      id: "farm-valley-02",
      name: "Cauvery Valley Orchards",
      ownerName: "Narayana Swamy & Sons",
      location: "Mandya, Karnataka",
      address: "Village Srirangapatna Taluk, Mandya",
      latitude: 12.4181,
      longitude: 76.6947,
      totalArea: 25.0,
      cultivableArea: 22.5,
      waterSource: "Cauvery River Canal + Automated Drip Filtration Station",
      geofenceRadiusMeters: 800,
      status: FarmStatus.ACTIVE,
    },
  });

  // Estate 3: Sunrise Organic Vineyards (Nashik, Maharashtra) - ACTIVE Export Table Grapes
  const sunriseFarm = await prisma.farm.create({
    data: {
      id: "farm-sunrise-03",
      name: "Sunrise Organic Vineyards",
      ownerName: "Priyanka Deshmukh",
      location: "Nashik, Maharashtra",
      address: "Gat No. 112, Dindori Road, Nashik",
      latitude: 20.011,
      longitude: 73.7903,
      totalArea: 10.0,
      cultivableArea: 8.5,
      waterSource: "Open Irrigation Well + 10HP Solar Pump Array",
      geofenceRadiusMeters: 500,
      status: FarmStatus.ACTIVE,
    },
  });

  // Estate 4: Deccan Plateau High-Tech Nursery (Dharmapuri, Tamil Nadu) - SETUP (Gatekeeper Demo)
  const deccanFarm = await prisma.farm.create({
    data: {
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
      status: FarmStatus.SETUP, // Triggers Setup Wizard Checklist on Farm Hub
    },
  });

  // Estate 5: Nilgiri Foothills Tea & Spices (Ooty, Tamil Nadu) - INACTIVE (Winter Maintenance)
  const nilgiriFarm = await prisma.farm.create({
    data: {
      id: "farm-nilgiri-05",
      name: "Nilgiri Foothills Tea & Spices",
      ownerName: "Highland Agro Holdings",
      location: "Ooty, Tamil Nadu",
      address: "Kotagiri Estate Road, Nilgiris",
      latitude: 11.4285,
      longitude: 76.8652,
      totalArea: 18.0,
      cultivableArea: 15.0,
      waterSource: "Natural Mountain Stream Gravity Reservoir",
      geofenceRadiusMeters: 1000,
      status: FarmStatus.INACTIVE, // Demonstrates inactive status filter
    },
  });

  // Assign Farm Access permissions
  const accesses = [
    // Farm Admin manages all farms
    { userId: farmAdmin.id, farmId: greenfieldFarm.id, canManage: true },
    { userId: farmAdmin.id, farmId: valleyFarm.id, canManage: true },
    { userId: farmAdmin.id, farmId: sunriseFarm.id, canManage: true },
    { userId: farmAdmin.id, farmId: deccanFarm.id, canManage: true },
    { userId: farmAdmin.id, farmId: nilgiriFarm.id, canManage: true },
    // Agronomist assigned across all farming estates
    { userId: agronomist.id, farmId: greenfieldFarm.id, canManage: false },
    { userId: agronomist.id, farmId: valleyFarm.id, canManage: false },
    { userId: agronomist.id, farmId: sunriseFarm.id, canManage: false },
    { userId: agronomist.id, farmId: deccanFarm.id, canManage: false },
    { userId: agronomist.id, farmId: nilgiriFarm.id, canManage: false },
    // Field Officers per Estate (with regional cross-coverage)
    { userId: officer1.id, farmId: greenfieldFarm.id, canManage: false },
    { userId: officer1.id, farmId: deccanFarm.id, canManage: false },
    { userId: officer2.id, farmId: valleyFarm.id, canManage: false },
    { userId: officer2.id, farmId: nilgiriFarm.id, canManage: false },
    { userId: officer3.id, farmId: sunriseFarm.id, canManage: false },
    { userId: officer3.id, farmId: nilgiriFarm.id, canManage: false },
  ];
  for (const acc of accesses) {
    await prisma.farmAccess.create({ data: acc });
  }

  // -------------------------------------------------------------------------
  // STEP 4: PLOTS & IRRIGATION ARCHITECTURE
  // -------------------------------------------------------------------------
  console.log("\n[4/7] Seeding land plots with multi-irrigation systems...");

  // Greenfield Plots
  const plotGf1 = await prisma.plot.create({
    data: {
      id: "plot-gf-01",
      farmId: greenfieldFarm.id,
      name: "Plot 1 - North Polyhouse Ridge",
      area: 4.5,
      latitude: 12.5286,
      longitude: 77.8343,
      soilType: "Red Sandy Loam (pH 6.4, EC 0.38 dS/m)",
      status: PlotStatus.ACTIVE,
      irrigation: {
        create: [
          { type: "Drip Automation (2.2 LPH PC Drippers)", details: "Pressure compensating automated lateral lines" },
          { type: "Overhead Climate Misters", details: "Micro-foggers for summer temperature drop" },
        ],
      },
    },
  });

  const plotGf2 = await prisma.plot.create({
    data: {
      id: "plot-gf-02",
      farmId: greenfieldFarm.id,
      name: "Plot 2 - South Shade Net Terrace",
      area: 3.5,
      latitude: 12.528,
      longitude: 77.8338,
      soilType: "Clay Loam with High Organic Carbon (1.4%)",
      status: PlotStatus.ACTIVE,
      irrigation: {
        create: [
          { type: "In-line Drip Fertigation", details: "Dual lateral per 90cm raised bed" },
        ],
      },
    },
  });

  const plotGf3 = await prisma.plot.create({
    data: {
      id: "plot-gf-03",
      farmId: greenfieldFarm.id,
      name: "Plot 3 - East Precision Open Field",
      area: 6.5,
      latitude: 12.5288,
      longitude: 77.8352,
      soilType: "Alluvial Red Soil with Drip Bedding",
      status: PlotStatus.ACTIVE,
      irrigation: {
        create: [
          { type: "Sub-Surface Drip Irrigation", details: "16mm drip tube buried at 15cm depth" },
          { type: "Micro-Sprinklers", details: "360-degree perimeter coverage" },
        ],
      },
    },
  });

  // Valley Plots (Mandya)
  const plotVal1 = await prisma.plot.create({
    data: {
      id: "plot-val-01",
      farmId: valleyFarm.id,
      name: "Plot A - Riverside Sweet Lime Block",
      area: 12.0,
      latitude: 12.4185,
      longitude: 76.695,
      soilType: "Deep River Silt & Loam (pH 7.2)",
      status: PlotStatus.ACTIVE,
      irrigation: {
        create: [{ type: "Basin Ring Drip Irrigation", details: "4 drippers per mature citrus tree" }],
      },
    },
  });

  const plotVal2 = await prisma.plot.create({
    data: {
      id: "plot-val-02",
      farmId: valleyFarm.id,
      name: "Plot B - Pomegranate Plateau",
      area: 10.5,
      latitude: 12.4178,
      longitude: 76.6942,
      soilType: "Red Gravelly Well-Drained Loam",
      status: PlotStatus.ACTIVE,
      irrigation: {
        create: [{ type: "Automated Drip Fertigation", details: "Venturi injection with EC/pH sensor station" }],
      },
    },
  });

  // Sunrise Plots (Nashik)
  const plotSun1 = await prisma.plot.create({
    data: {
      id: "plot-sun-01",
      farmId: sunriseFarm.id,
      name: "Plot 1 - Thompson Seedless Vineyard",
      area: 5.0,
      latitude: 20.0112,
      longitude: 73.7905,
      soilType: "Black Basaltic Loam with Gravel",
      status: PlotStatus.ACTIVE,
      irrigation: {
        create: [{ type: "Overhead Trellis Drip", details: "Suspended drip lines on Y-trellis system" }],
      },
    },
  });

  const plotSun2 = await prisma.plot.create({
    data: {
      id: "plot-sun-02",
      farmId: sunriseFarm.id,
      name: "Plot 2 - Crimson Seedless Block",
      area: 3.5,
      latitude: 20.0108,
      longitude: 73.7901,
      soilType: "Well-Drained Sandy Loam",
      status: PlotStatus.ACTIVE,
      irrigation: {
        create: [{ type: "Drip Automation", details: "1.6 LPH anti-siphon emitters" }],
      },
    },
  });

  // Deccan Plots (Dharmapuri - Nursery in SETUP)
  await prisma.plot.create({
    data: {
      id: "plot-dec-01",
      farmId: deccanFarm.id,
      name: "Nursery Block 1 - Germination Bay",
      area: 4.0,
      latitude: 12.1213,
      longitude: 78.1584,
      soilType: "Sterilized Cocopeat & Vermiculite Media",
      status: PlotStatus.SETUP,
      irrigation: {
        create: [{ type: "Automated Boom Sprayer", details: "Overhead motorized misting boom" }],
      },
    },
  });

  await prisma.plot.create({
    data: {
      id: "plot-dec-02",
      farmId: deccanFarm.id,
      name: "Nursery Block 2 - Hardening Yard",
      area: 6.0,
      latitude: 12.1209,
      longitude: 78.158,
      soilType: "Organic Nursery Potting Soil",
      status: PlotStatus.SETUP,
      irrigation: {
        create: [{ type: "Micro-Sprinklers", details: "Automated cycle every 3 hours" }],
      },
    },
  });

  // -------------------------------------------------------------------------
  // STEP 5: CROP CYCLES, BED MATH & 4-MILESTONE PLANS
  // -------------------------------------------------------------------------
  console.log("\n[5/7] Seeding precision crop cycles with agronomy milestones...");

  // Cycle 1: Color Bell Pepper / Capsicum (Indra F1) in Greenfield Plot 1
  const cycleCapsicum = await prisma.cropCycle.create({
    data: {
      id: "cycle-capsicum-01",
      plotId: plotGf1.id,
      cropName: "Color Bell Pepper / Capsicum (Indra F1)",
      startDate: dateOnly(-28),
      expectedFirstHarvestDate: dateOnly(45),
      establishmentType: EstablishmentType.NURSERY_TRANSPLANTATION,
      status: CropCycleStatus.ACTIVE,
      bedPreparationEnabled: true,
      bedWidthCm: 90,
      bedCenterDistanceCm: 150,
      expectedBedsPerAcre: 290,
      expectedTotalBeds: 1305,
      actualBedsCreated: 1300,
      mulchEnabled: true,
      mulchHolePattern: "Zig-Zag 40cm x 50cm Double Row",
      plantDistanceCm: 45,
      expectedPlantsPerAcre: 7700,
      expectedPlants: 34650,
      actualPlants: 34500,
      varieties: {
        create: [
          { name: "Indra Red F1 (Syngenta)" },
          { name: "Bachata Yellow F1 (Rijk Zwaan)" },
          { name: "Pasarella Orange F1" },
        ],
      },
      milestones: {
        create: [
          {
            name: "Deep Tillage & Basal Fertigation",
            targetDate: dateOnly(-26),
            status: MilestoneStatus.COMPLETED,
            completedAt: dateOffset(-25, 17, 30),
            remarks: "Applied 25 tons well-decomposed FYM + 250kg Neem Cake + 50kg Single Super Phosphate.",
          },
          {
            name: "Raised Bed Making & Silver-Black Mulch Laying",
            targetDate: dateOnly(-20),
            status: MilestoneStatus.COMPLETED,
            completedAt: dateOffset(-19, 16, 0),
            remarks: "1300 beds shaped to 90cm top width with 25-micron UV stabilized mulch film.",
          },
          {
            name: "Seedling Transplantation & Bio-Drenching",
            targetDate: dateOnly(-14),
            status: MilestoneStatus.COMPLETED,
            completedAt: dateOffset(-13, 11, 45),
            remarks: "34,500 35-day-old hardened seedlings transplanted and drenched with Humic Acid + Trichoderma.",
          },
          {
            name: "Vegetative Trellising & First Flower Pinching",
            targetDate: dateOnly(5),
            status: MilestoneStatus.IN_PROGRESS,
            remarks: "Vertical string trellising initiated in Block A. Pinching crown flowers to boost vegetative canopy.",
          },
          {
            name: "Commercial Fruit Harvest & Grading",
            targetDate: dateOnly(45),
            status: MilestoneStatus.PENDING,
            remarks: "Anticipated first picking of 4-lobed premium blocky fruits (180g-220g caliber).",
          },
        ],
      },
    },
  });

  // Cycle 2: English Greenhouse Cucumber (Kian F1) in Greenfield Plot 2
  const cycleCucumber = await prisma.cropCycle.create({
    data: {
      id: "cycle-cucumber-02",
      plotId: plotGf2.id,
      cropName: "English Greenhouse Cucumber (Kian F1)",
      startDate: dateOnly(-21),
      expectedFirstHarvestDate: dateOnly(20),
      establishmentType: EstablishmentType.NURSERY_TRANSPLANTATION,
      status: CropCycleStatus.ACTIVE,
      bedPreparationEnabled: true,
      bedWidthCm: 80,
      bedCenterDistanceCm: 140,
      expectedBedsPerAcre: 310,
      expectedTotalBeds: 1085,
      actualBedsCreated: 1080,
      mulchEnabled: true,
      mulchHolePattern: "Single Row 30cm",
      plantDistanceCm: 30,
      expectedPlantsPerAcre: 9500,
      expectedPlants: 33250,
      actualPlants: 33100,
      varieties: {
        create: [{ name: "Kian F1 Parthenocarpic" }, { name: "Hilton F1" }],
      },
      milestones: {
        create: [
          {
            name: "Soil Solarization & Bed Disinfection",
            targetDate: dateOnly(-20),
            status: MilestoneStatus.COMPLETED,
            completedAt: dateOffset(-19, 18, 0),
          },
          {
            name: "Transplanting & Initial Drip Calibration",
            targetDate: dateOnly(-14),
            status: MilestoneStatus.COMPLETED,
            completedAt: dateOffset(-14, 12, 0),
          },
          {
            name: "Overhead Vine Lowering & Shoot De-leafing",
            targetDate: dateOnly(3),
            status: MilestoneStatus.IN_PROGRESS,
          },
          {
            name: "Continuous Daily Picking & Cold Storage",
            targetDate: dateOnly(20),
            status: MilestoneStatus.PENDING,
          },
        ],
      },
    },
  });

  // Cycle 3: Icebox Watermelon (Direct Sowing) in Greenfield Plot 3
  const cycleWatermelon = await prisma.cropCycle.create({
    data: {
      id: "cycle-watermelon-03",
      plotId: plotGf3.id,
      cropName: "Icebox Watermelon (Sugar Baby & Black Pearl)",
      startDate: dateOnly(-35),
      expectedFirstHarvestDate: dateOnly(30),
      establishmentType: EstablishmentType.DIRECT_SOWING,
      status: CropCycleStatus.ACTIVE,
      bedPreparationEnabled: true,
      bedWidthCm: 120,
      bedCenterDistanceCm: 250,
      expectedBedsPerAcre: 160,
      expectedTotalBeds: 1040,
      actualBedsCreated: 1040,
      mulchEnabled: true,
      mulchHolePattern: "Staggered 60cm",
      plantDistanceCm: 60,
      expectedPlantsPerAcre: 2900,
      expectedPlants: 18850,
      actualPlants: 18800,
      varieties: {
        create: [{ name: "Sugar Baby Classic" }, { name: "Black Pearl Seedless F1" }],
      },
      milestones: {
        create: [
          {
            name: "Laser Land Levelling & Basal Organic Enrichment",
            targetDate: dateOnly(-34),
            status: MilestoneStatus.COMPLETED,
            completedAt: dateOffset(-33, 17, 0),
          },
          {
            name: "Precision Direct Seed Sowing",
            targetDate: dateOnly(-28),
            status: MilestoneStatus.COMPLETED,
            completedAt: dateOffset(-28, 14, 0),
          },
          {
            name: "Vine Spreading & Fruit Setting Boron Spray",
            targetDate: dateOnly(2),
            status: MilestoneStatus.IN_PROGRESS,
          },
          {
            name: "Brix Sugar Index Verification & Bulk Dispatch",
            targetDate: dateOnly(30),
            status: MilestoneStatus.PENDING,
          },
        ],
      },
    },
  });

  // Cycle 4: Pomegranate (Bhagwa) in Mandya Plot B
  const cyclePomegranate = await prisma.cropCycle.create({
    data: {
      id: "cycle-pomegranate-04",
      plotId: plotVal2.id,
      cropName: "Bhagwa Pomegranate High-Density Orchard",
      startDate: dateOnly(-60),
      expectedFirstHarvestDate: dateOnly(60),
      establishmentType: EstablishmentType.NURSERY_TRANSPLANTATION,
      status: CropCycleStatus.ACTIVE,
      bedPreparationEnabled: false,
      varieties: {
        create: [{ name: "Super Bhagwa (Arakta Selection)" }],
      },
      milestones: {
        create: [
          { name: "Bahar Treatment & Water Stress Withholding", targetDate: dateOnly(-55), status: MilestoneStatus.COMPLETED, completedAt: dateOffset(-54, 18, 0) },
          { name: "Flowering Induction & Micronutrient Drenching", targetDate: dateOnly(-20), status: MilestoneStatus.COMPLETED, completedAt: dateOffset(-19, 16, 0) },
          { name: "Fruit Setting & Paper Bagging", targetDate: dateOnly(10), status: MilestoneStatus.IN_PROGRESS },
          { name: "Aril Color Development & Final Export Harvest", targetDate: dateOnly(60), status: MilestoneStatus.PENDING },
        ],
      },
    },
  });

  // Cycle 5: Table Grapes (Thompson Seedless) in Nashik Plot 1
  const cycleGrapes = await prisma.cropCycle.create({
    data: {
      id: "cycle-grapes-05",
      plotId: plotSun1.id,
      cropName: "Thompson Seedless Export Table Grapes",
      startDate: dateOnly(-45),
      expectedFirstHarvestDate: dateOnly(50),
      establishmentType: EstablishmentType.NURSERY_TRANSPLANTATION,
      status: CropCycleStatus.ACTIVE,
      bedPreparationEnabled: false,
      varieties: {
        create: [{ name: "Thompson Seedless Clone 2A" }, { name: "Sonaka" }],
      },
      milestones: {
        create: [
          { name: "October Forward Pruning & Hydrogen Cyanamide Application", targetDate: dateOnly(-42), status: MilestoneStatus.COMPLETED, completedAt: dateOffset(-41, 17, 0) },
          { name: "Shoot Thinning & Sub-Cane Selection", targetDate: dateOnly(-18), status: MilestoneStatus.COMPLETED, completedAt: dateOffset(-17, 15, 0) },
          { name: "Berry Thinning & GA3 Cluster Dipping", targetDate: dateOnly(4), status: MilestoneStatus.IN_PROGRESS },
          { name: "Brix Verification & Cold Storage Pre-Cooling", targetDate: dateOnly(50), status: MilestoneStatus.PENDING },
        ],
      },
    },
  });

  // -------------------------------------------------------------------------
  // STEP 6: DYNAMIC 7-DAY ROLLING AGRONOMY WORK ORDERS & OPERATIONS MATRIX
  // -------------------------------------------------------------------------
  console.log("\n[6/7] Seeding 7-day rolling work orders and field execution tasks...");

  // Agronomy Plan for Today
  const todayPlan = await prisma.agronomyPlan.create({
    data: {
      id: "plan-today-01",
      farmId: greenfieldFarm.id,
      planDate: dateOnly(0),
      notes: "High solar radiation day. Complete morning fertigation prior to 09:30 AM. Monitor polyhouse humidity levels.",
      manualTemperature: 29.4,
      manualHumidity: 62.0,
      manualWindSpeed: 10.5,
      manualRainForecast: 0.0,
      manualWeatherRemarks: "Clear sunny skies. Moderate evaporation rate expected.",
      createdById: agronomist.id,
    },
  });

  // OVERDUE TASK (Due Yesterday, In-Progress -> Triggers Delayed Alerts Metric)
  const taskOverdue = await prisma.task.create({
    data: {
      id: "task-overdue-01",
      farmId: greenfieldFarm.id,
      plotId: plotGf2.id,
      cropCycleId: cycleCucumber.id,
      origin: TaskOrigin.AGRONOMIST,
      category: "Irrigation & Sanitization",
      title: "Urgent Drip Line Flushing & Nitric Acid Descaling",
      description: "Perform 0.2% nitric acid line wash to clear mineral scale deposits from cucumber emitter laterals.",
      instructions: "Run system at 2.0 bar pressure. Flush sub-mains for 15 minutes until clear water discharges from flush valves.",
      priority: "URGENT",
      dueDate: dateOnly(-1), // Due yesterday
      status: TaskStatus.IN_PROGRESS,
      assignedOfficerId: officer1.id,
      createdById: agronomist.id,
    },
  });

  // PAST COMPLETED TASK (Completed Yesterday with Materials & Labour Telemetry)
  const taskPastCompleted = await prisma.task.create({
    data: {
      id: "task-past-comp-02",
      farmId: greenfieldFarm.id,
      plotId: plotGf1.id,
      cropCycleId: cycleCapsicum.id,
      origin: TaskOrigin.AGRONOMIST,
      category: "Soil Health & Drenching",
      title: "Rootzone Biological Inoculation: Trichoderma + VAM Mycorrhiza",
      description: "Drenching 1300 capsicum beds with beneficial bio-fungicide to prevent Pythium root rot.",
      instructions: "Mix 2kg Trichoderma Viride and 5kg VAM powder in 200L water tank. Deliver via venture injector at 1.8 bar.",
      priority: "HIGH",
      dueDate: dateOnly(-1),
      status: TaskStatus.COMPLETED,
      assignedOfficerId: officer1.id,
      createdById: agronomist.id,
      executions: {
        create: {
          officerId: officer1.id,
          status: TaskStatus.COMPLETED,
          startedAt: dateOffset(-1, 8, 30),
          completedAt: dateOffset(-1, 12, 15),
          remarks: "Successfully drenched all 1300 beds in Plot 1. Moisture sensor confirmed uniform depth penetration.",
          labour: {
            create: {
              labourers: 3,
              hours: 3.75,
              labourHours: 11.25,
            },
          },
          materials: {
            create: [
              { materialName: "Trichoderma Viride Bio-Fungicide (2x10^8 CFU/g)", quantity: 2.0, unit: "kg" },
              { materialName: "Vesicular Arbuscular Mycorrhiza (VAM)", quantity: 5.0, unit: "kg" },
              { materialName: "Liquid Humic Acid Extract (12%)", quantity: 3.0, unit: "Litre" },
            ],
          },
        },
      },
    },
  });

  // TODAY'S TASKS (For Ramesh Patel's "My Day" Dashboard on /officer/day)
  // Task 1: In-Progress Fertigation
  const taskToday1 = await prisma.task.create({
    data: {
      id: "task-today-01",
      farmId: greenfieldFarm.id,
      plotId: plotGf1.id,
      cropCycleId: cycleCapsicum.id,
      planId: todayPlan.id,
      origin: TaskOrigin.AGRONOMIST,
      category: "Fertigation",
      title: "Morning Fertigation: 12:61:00 Mono Ammonium Phosphate + Micro-Nutrients",
      description: "Inject root-strengthening phosphorus boost to support early flowering in Plot 1 polyhouse.",
      instructions: "Dissolve 15kg 12:61:00 MAP + 500g Chelated Micronutrient Combo in Tank A. Maintain EC at 1.8 mS/cm.",
      priority: "URGENT",
      dueDate: dateOnly(0),
      status: TaskStatus.IN_PROGRESS,
      assignedOfficerId: officer1.id,
      createdById: agronomist.id,
    },
  });

  // Task 2: Daily Monitoring Task with Camera Trigger
  const taskToday2 = await prisma.task.create({
    data: {
      id: "task-today-02",
      farmId: greenfieldFarm.id,
      plotId: plotGf1.id,
      cropCycleId: cycleCapsicum.id,
      origin: TaskOrigin.DAILY_MONITORING,
      category: "Scouting",
      title: "Daily Monitoring · Color Bell Pepper / Capsicum (Indra F1)",
      description: "Examine foliage for thrips, whiteflies, and rootzone moisture consistency across polyhouse bays 1 to 4.",
      instructions: "Take 2 reference photos of underside leaves. Record crown flower count and aphid status.",
      priority: "MEDIUM",
      dueDate: dateOnly(0),
      status: TaskStatus.ASSIGNED,
      assignedOfficerId: officer1.id,
      createdById: agronomist.id,
    },
  });

  // Task 3: Support Activity ready to start
  const taskToday3 = await prisma.task.create({
    data: {
      id: "task-today-03",
      farmId: greenfieldFarm.id,
      plotId: plotGf2.id,
      cropCycleId: cycleCucumber.id,
      origin: TaskOrigin.AGRONOMIST,
      category: "Canopy Management",
      title: "Support Activity: Overhead Trellis String Tensioning & Vine Clips",
      description: "Fasten growing cucumber main stems to overhead galvanized support wires using plastic vine clips.",
      instructions: "Remove lower secondary lateral shoots up to node 5. Avoid pinching apical growing tip.",
      priority: "MEDIUM",
      dueDate: dateOnly(0),
      status: TaskStatus.ASSIGNED,
      assignedOfficerId: officer1.id,
      createdById: agronomist.id,
    },
  });

  // Task 4: Completed Milestone Task (Shows 1 of 4 completed in queue)
  const taskToday4 = await prisma.task.create({
    data: {
      id: "task-today-04",
      farmId: greenfieldFarm.id,
      plotId: plotGf3.id,
      cropCycleId: cycleWatermelon.id,
      origin: TaskOrigin.SYSTEM,
      category: "Milestone Execution",
      title: "Milestone: Vine Spreading & Fruit Setting Boron Spray",
      description: "Apply foliar Boron 20% spray to improve pollen viability and prevent hollow heart in watermelon.",
      instructions: "Spray 1.5g Boron per litre water. Target flowers during active bee visitation hours (07:00-09:30 AM).",
      priority: "HIGH",
      dueDate: dateOnly(0),
      status: TaskStatus.COMPLETED,
      assignedOfficerId: officer1.id,
      createdById: agronomist.id,
      executions: {
        create: {
          officerId: officer1.id,
          status: TaskStatus.COMPLETED,
          startedAt: dateOffset(0, 6, 30),
          completedAt: dateOffset(0, 8, 45),
          remarks: "Sprayed entire 6.5 acres of Plot 3. Uniform coverage achieved without leaf scorch.",
          labour: {
            create: { labourers: 2, hours: 2.25, labourHours: 4.5 },
          },
          materials: {
            create: [
              { materialName: "Solubor Disodium Octaborate Tetrahydrate (20% B)", quantity: 2.5, unit: "kg" },
              { materialName: "Non-Ionic Silicon Spreader Sticking Agent", quantity: 300.0, unit: "ml" },
            ],
          },
        },
      },
    },
  });

  // FUTURE ROLLING DAYS WORK ORDERS (Days +1 to +6)
  const futureTasks = [
    {
      id: "task-future-01",
      farmId: greenfieldFarm.id,
      plotId: plotGf1.id,
      cropCycleId: cycleCapsicum.id,
      origin: TaskOrigin.AGRONOMIST,
      category: "Foliar Nutrition",
      title: "Foliar Spray: Calcium Boron Chelate & Cold-Water Seaweed Extract",
      description: "Prevent blossom end rot in developing capsicum fruits and strengthen cell wall elasticity.",
      instructions: "Apply 2.5ml/L Chelate Cal-Bor. Spray during overcast or early morning hours.",
      priority: "HIGH",
      dueDate: dateOnly(1),
      status: TaskStatus.ASSIGNED,
      assignedOfficerId: officer1.id,
    },
    {
      id: "task-future-02",
      farmId: greenfieldFarm.id,
      plotId: plotGf2.id,
      cropCycleId: cycleCucumber.id,
      origin: TaskOrigin.AGRONOMIST,
      category: "Maintenance",
      title: "Canopy Irrigation & Sand Media Filter Automatic Backwash",
      description: "Perform backwash cycle on dual vertical sand filters to purge accumulated organic algae.",
      instructions: "Record inlet and outlet pressure gauges. Differential pressure must drop below 0.3 bar.",
      priority: "MEDIUM",
      dueDate: dateOnly(2),
      status: TaskStatus.ASSIGNED,
      assignedOfficerId: officer1.id,
    },
    {
      id: "task-future-03",
      farmId: greenfieldFarm.id,
      plotId: plotGf1.id,
      cropCycleId: cycleCapsicum.id,
      origin: TaskOrigin.AGRONOMIST,
      category: "Bio-Protection",
      title: "Preventive Bio-Pesticide Spray: Cold Pressed Neem Oil 10,000 PPM",
      description: "Ecological barrier spray against thrips and whitefly nymphs. Audit yellow/blue sticky traps.",
      instructions: "Maintain spray tank agitation. Ensure coverage on abaxial leaf surfaces.",
      priority: "MEDIUM",
      dueDate: dateOnly(3),
      status: TaskStatus.ASSIGNED,
      assignedOfficerId: officer1.id,
    },
    {
      id: "task-future-04",
      farmId: greenfieldFarm.id,
      plotId: plotGf3.id,
      cropCycleId: cycleWatermelon.id,
      origin: TaskOrigin.AGRONOMIST,
      category: "Fertigation",
      title: "Fertigation Boost: 00:00:50 Potassium Sulphate (SOP) + Magnesium Sulphate",
      description: "High potassium feeding to accelerate sugar accumulation (Brix >= 12.0) in watermelons.",
      instructions: "Inject 20kg SOP per acre over 45 minutes of drip cycle.",
      priority: "HIGH",
      dueDate: dateOnly(4),
      status: TaskStatus.ASSIGNED,
      assignedOfficerId: officer1.id,
    },
    {
      id: "task-future-05",
      farmId: greenfieldFarm.id,
      plotId: plotGf2.id,
      cropCycleId: cycleCucumber.id,
      origin: TaskOrigin.AGRONOMIST,
      category: "Sanitation",
      title: "Inter-Row Manual Weeding & Drip Emitter Discharge Audit",
      description: "Catch-can test 20 drippers along row 4 and remove volunteer weeds along shade-net edges.",
      instructions: "Clean clogged micro-tubes using vinegar solution if discharge variance > 10%.",
      priority: "LOW",
      dueDate: dateOnly(5),
      status: TaskStatus.ASSIGNED,
      assignedOfficerId: officer1.id,
    },
    {
      id: "task-future-06",
      farmId: greenfieldFarm.id,
      plotId: plotGf1.id,
      cropCycleId: cycleCapsicum.id,
      origin: TaskOrigin.AGRONOMIST,
      category: "Soil Science",
      title: "Weekly Soil Profile Audit: EC, pH & Volumetric Moisture Mapping",
      description: "Probe sensor measurements at 15cm and 30cm root depths in all 3 polyhouse bays.",
      instructions: "Log readings in agronomy portal. Notify Dr. Rao if EC exceeds 2.2 mS/cm.",
      priority: "HIGH",
      dueDate: dateOnly(6),
      status: TaskStatus.ASSIGNED,
      assignedOfficerId: officer1.id,
    },
  ];

  for (const t of futureTasks) {
    await prisma.task.create({
      data: {
        ...t,
        createdById: agronomist.id,
      },
    });
  }

  // -------------------------------------------------------------------------
  // STEP 7: SHIFTS, ATTENDANCE, ACTION CENTER EXCEPTIONS & INCIDENTS
  // -------------------------------------------------------------------------
  console.log("\n[7/7] Seeding attendance rosters, action center approvals, and incident evidence photos...");

  // Verified High-Res Working Photo URLs (Unsplash CDN permanently accessible)
  const PHOTO_PIPELINE_BURST = "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=1200&q=80"; // Irrigation pipeline burst repair
  const PHOTO_PEST_BLIGHT = "https://images.unsplash.com/photo-1592417817098-8f3d6eb22509?auto=format&fit=crop&w=1200&q=80"; // Blight / pest on crop foliage
  const PHOTO_POWDERY_MILDEW = "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=1200&q=80"; // Vineyard foliage disease
  const PHOTO_HEALTHY_CAPSICUM = "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=1200&q=80"; // Healthy capsicum on vine
  const PHOTO_HEALTHY_CUCUMBER = "https://images.unsplash.com/photo-1449339854873-750e6913301b?auto=format&fit=crop&w=1200&q=80"; // Greenhouse crop
  const PHOTO_OFFICER_SELFIE = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80"; // Lead Officer portrait
  const PHOTO_OFFICER_SURESH = "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=800&q=80"; // Mandya Officer portrait
  const PHOTO_OFFICER_POOJA = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80"; // Nashik Officer portrait

  // 1. ATTENDANCE: Ramesh Patel (Hosur) - UNSTARTED TODAY (Ready for live clock-in demo!)
  // Past attendance records for Ramesh (to show historical compliance)
  await prisma.attendance.create({
    data: {
      userId: officer1.id,
      farmId: greenfieldFarm.id,
      attendanceDate: dateOnly(-1),
      status: AttendanceStatus.COMPLETED,
      startAt: dateOffset(-1, 7, 30),
      endAt: dateOffset(-1, 17, 15),
      startLatitude: 12.5284,
      startLongitude: 77.8341,
      startSelfieKey: PHOTO_OFFICER_SELFIE,
    },
  });

  await prisma.attendance.create({
    data: {
      userId: officer1.id,
      farmId: greenfieldFarm.id,
      attendanceDate: dateOnly(-2),
      status: AttendanceStatus.COMPLETED,
      startAt: dateOffset(-2, 7, 40),
      endAt: dateOffset(-2, 17, 0),
      startLatitude: 12.5284,
      startLongitude: 77.8341,
      startSelfieKey: PHOTO_OFFICER_SELFIE,
    },
  });

  // 2. ATTENDANCE: Suresh Kumar (Mandya) - CLOCKED IN OUTSIDE GEOFENCE TODAY (Pending Approval in Action Center!)
  const exceptionAttendance = await prisma.attendance.create({
    data: {
      userId: officer2.id,
      farmId: valleyFarm.id,
      attendanceDate: dateOnly(0),
      status: AttendanceStatus.EXCEPTION_PENDING,
      startAt: dateOffset(0, 8, 15),
      endAt: null,
      startLatitude: 12.4285, // 1,420m away from 800m geofence
      startLongitude: 76.7025,
      startSelfieKey: PHOTO_OFFICER_SURESH,
      exceptionReason: "Procuring emergency replacement 15HP submersible pump capacitors and suction valves from Mandya Agricultural Machinery Depot. Gatekeeper informed.",
      exception: {
        create: {
          distanceMeters: 1420.0,
          reason: "Procuring emergency replacement 15HP submersible pump capacitors and suction valves from Mandya Agricultural Machinery Depot. Gatekeeper informed.",
          status: ApprovalStatus.PENDING,
        },
      },
    },
  });

  // 3. ATTENDANCE: Pooja Deshmukh (Nashik) - COMPLETED SHIFT TODAY
  await prisma.attendance.create({
    data: {
      userId: officer3.id,
      farmId: sunriseFarm.id,
      attendanceDate: dateOnly(0),
      status: AttendanceStatus.COMPLETED,
      startAt: dateOffset(0, 6, 30),
      endAt: dateOffset(0, 14, 45), // Clocked out after 8h 15m
      startLatitude: 20.011,
      startLongitude: 73.7903,
      startSelfieKey: PHOTO_OFFICER_POOJA,
    },
  });

  // 4. GOVERNANCE: LOCATION CHANGE REQUEST (Pending Approval in Action Center)
  await prisma.locationChangeRequest.create({
    data: {
      farmId: sunriseFarm.id,
      requesterId: farmAdmin.id,
      proposedLatitude: 20.0135,
      proposedLongitude: 73.7925,
      reason: "Incorporating newly acquired 1.5-acre parcel on northern perimeter for solar cold room and pre-cooling grading facility. Expanding geofence radius.",
      status: ApprovalStatus.PENDING,
      createdAt: dateOffset(-1, 10, 30),
    },
  });

  // 5. CRITICAL INCIDENT: Irrigation Main Line Burst (In Action Center with Lightbox photo)
  const incidentCritical = await prisma.incident.create({
    data: {
      id: "incident-crit-01",
      farmId: greenfieldFarm.id,
      plotId: plotGf1.id,
      cropCycleId: cycleCapsicum.id,
      reporterId: officer1.id,
      level: IncidentLevel.PLOT,
      type: "Irrigation Main Line Burst & Pressure Collapse",
      severity: "CRITICAL",
      impactPercent: 18.5,
      description: "Sub-main 63mm PVC distribution pipe ruptured near solenoid manifold 4. Water line pressure collapsed from 2.8 bar to 0.4 bar across Plot 1 polyhouse.",
      status: IncidentStatus.OPEN,
      createdAt: dateOffset(0, 7, 50),
      media: {
        create: [
          {
            storageKey: `${PHOTO_PIPELINE_BURST}&asset=incident-crit-01`,
            kind: MediaKind.INCIDENT_PHOTO,
            mimeType: "image/jpeg",
            sizeBytes: 1284500,
            farmId: greenfieldFarm.id,
            uploadedById: officer1.id,
            verifiedAt: dateOffset(0, 7, 52),
          },
        ],
      },
      followUps: {
        create: [
          {
            authorId: farmAdmin.id,
            action: "EMERGENCY_DISPATCH",
            remarks: "Pump station power isolated immediately. Plumber and spare 63mm PN-10 couplers dispatched on site.",
            createdAt: dateOffset(0, 8, 10),
          },
        ],
      },
    },
  });

  // 6. HIGH INCIDENT: Pomegranate Bacterial Blight Outbreak
  const incidentHigh = await prisma.incident.create({
    data: {
      id: "incident-high-02",
      farmId: valleyFarm.id,
      plotId: plotVal2.id,
      cropCycleId: cyclePomegranate.id,
      reporterId: officer2.id,
      level: IncidentLevel.CROP,
      type: "Bacterial Blight (Xanthomonas axonopodis pv. punicae)",
      severity: "HIGH",
      impactPercent: 14.0,
      description: "Oily dark brown water-soaked angular spots identified on developing fruit and twigs in rows 14-18. Rapid spread observed post evening rains.",
      status: IncidentStatus.OPEN,
      createdAt: dateOffset(-1, 15, 30),
      media: {
        create: [
          {
            storageKey: `${PHOTO_PEST_BLIGHT}&asset=incident-high-02`,
            kind: MediaKind.INCIDENT_PHOTO,
            mimeType: "image/jpeg",
            sizeBytes: 1492000,
            farmId: valleyFarm.id,
            uploadedById: officer2.id,
            verifiedAt: dateOffset(-1, 15, 32),
          },
        ],
      },
      followUps: {
        create: [
          {
            authorId: agronomist.id,
            action: "AGRONOMY_PRESCRIPTION",
            remarks: "Prescribed immediate copper oxychloride 50 WP (2.5g/L) + Streptocycline (0.5g/L) spray. Discontinue overhead sprinkling.",
            createdAt: dateOffset(-1, 16, 45),
          },
        ],
      },
    },
  });

  // 7. RESOLVED INCIDENT: Minor Drip Lateral Silt Clogging
  await prisma.incident.create({
    data: {
      id: "incident-res-03",
      farmId: greenfieldFarm.id,
      plotId: plotGf3.id,
      cropCycleId: cycleWatermelon.id,
      reporterId: officer1.id,
      level: IncidentLevel.PLOT,
      type: "Drip Lateral Silt Deposition",
      severity: "LOW",
      impactPercent: 2.0,
      description: "Silt deposit reduced discharge in laterals 8 to 11 in watermelon Plot 3.",
      status: IncidentStatus.RESOLVED,
      createdAt: dateOffset(-3, 11, 0),
      followUps: {
        create: [
          {
            authorId: officer1.id,
            action: "LINE_FLUSH_COMPLETED",
            remarks: "Flushed end plugs and normalized flow rate to 2.2 LPH.",
            createdAt: dateOffset(-3, 14, 0),
          },
        ],
      },
    },
  });

  // 8. CROP MONITORING SIGNALS: POOR HEALTH ALERTS (In Action Center)
  await prisma.cropMonitoring.create({
    data: {
      farmId: sunriseFarm.id,
      plotId: plotSun1.id,
      cropCycleId: cycleGrapes.id,
      officerId: officer3.id,
      status: HealthStatus.POOR,
      stage: "Berry Bulking & Cane Lignification",
      impactPercent: 8.5,
      remarks: "Severe powdery mildew white fungal coating visible on young grape clusters and shoot tips. High RH (82%) recorded.",
      createdAt: dateOffset(-1, 11, 20),
      media: {
        create: [
          {
            storageKey: `${PHOTO_POWDERY_MILDEW}&asset=monitoring-grapes-poor`,
            kind: MediaKind.CROP_PHOTO,
            mimeType: "image/jpeg",
            sizeBytes: 1102000,
            farmId: sunriseFarm.id,
            uploadedById: officer3.id,
            verifiedAt: dateOffset(-1, 11, 22),
          },
        ],
      },
    },
  });

  await prisma.cropMonitoring.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plotGf1.id,
      cropCycleId: cycleCapsicum.id,
      officerId: officer1.id,
      status: HealthStatus.POOR,
      stage: "Flowering & Early Fruit Set",
      impactPercent: 6.0,
      remarks: "Early aphid colonization and leaf curling detected along eastern sidewall vents of polyhouse bay 1.",
      createdAt: dateOffset(0, 7, 30),
      media: {
        create: [
          {
            storageKey: `${PHOTO_PEST_BLIGHT}&asset=monitoring-capsicum-aphids`,
            kind: MediaKind.CROP_PHOTO,
            mimeType: "image/jpeg",
            sizeBytes: 1154000,
            farmId: greenfieldFarm.id,
            uploadedById: officer1.id,
            verifiedAt: dateOffset(0, 7, 32),
          },
        ],
      },
    },
  });

  // 9. CROP MONITORING SIGNALS: GOOD HEALTH OBSERVATIONS
  await prisma.cropMonitoring.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plotGf2.id,
      cropCycleId: cycleCucumber.id,
      officerId: officer1.id,
      status: HealthStatus.GOOD,
      stage: "Active Vegetative & Flowering",
      remarks: "Exceptional dark green foliage vigor, uniform internode spacing (12cm), and 100% female flower set.",
      createdAt: dateOffset(-1, 9, 15),
      media: {
        create: [
          {
            storageKey: `${PHOTO_HEALTHY_CUCUMBER}&asset=monitoring-cucumber-good`,
            kind: MediaKind.CROP_PHOTO,
            mimeType: "image/jpeg",
            sizeBytes: 980000,
            farmId: greenfieldFarm.id,
            uploadedById: officer1.id,
            verifiedAt: dateOffset(-1, 9, 17),
          },
        ],
      },
    },
  });

  await prisma.cropMonitoring.create({
    data: {
      farmId: greenfieldFarm.id,
      plotId: plotGf3.id,
      cropCycleId: cycleWatermelon.id,
      officerId: officer1.id,
      status: HealthStatus.GOOD,
      stage: "Vine Spreading & Fruit Bulking",
      remarks: "High canopy coverage (92%), zero weed infestation through silver-black mulch, excellent fruit elongation.",
      createdAt: dateOffset(-2, 10, 0),
      media: {
        create: [
          {
            storageKey: `${PHOTO_HEALTHY_CAPSICUM}&asset=monitoring-watermelon-good`,
            kind: MediaKind.CROP_PHOTO,
            mimeType: "image/jpeg",
            sizeBytes: 1045000,
            farmId: greenfieldFarm.id,
            uploadedById: officer1.id,
            verifiedAt: dateOffset(-2, 10, 2),
          },
        ],
      },
    },
  });

  // 10. GOVERNANCE AUDIT TRAIL LOGS (/audit)
  await prisma.auditLog.createMany({
    data: [
      {
        actorId: superAdmin.id,
        action: "ESTATE_ACTIVATION",
        entityType: "Farm",
        entityId: greenfieldFarm.id,
        metadata: { name: greenfieldFarm.name, totalArea: 16.0, cultivableArea: 14.5 },
        createdAt: dateOffset(-30, 9, 0),
      },
      {
        actorId: agronomist.id,
        action: "CROP_CYCLE_LAUNCHED",
        entityType: "CropCycle",
        entityId: cycleCapsicum.id,
        metadata: { cropName: "Color Bell Pepper / Capsicum (Indra F1)", plotId: plotGf1.id },
        createdAt: dateOffset(-28, 10, 30),
      },
      {
        actorId: farmAdmin.id,
        action: "ROSTER_DISPATCH",
        entityType: "Task",
        entityId: taskToday1.id,
        metadata: { count: 7, origin: "7_DAY_DISPATCH" },
        createdAt: dateOffset(0, 6, 0),
      },
      {
        actorId: officer1.id,
        action: "START_DAY",
        entityType: "Attendance",
        entityId: greenfieldFarm.id,
        metadata: { status: "OPEN", withinGeofence: true },
        createdAt: dateOffset(0, 7, 45),
      },
      {
        actorId: officer2.id,
        action: "START_DAY_EXCEPTION",
        entityType: "Attendance",
        entityId: exceptionAttendance.id,
        metadata: { distanceMeters: 1420.0, outside: true },
        createdAt: dateOffset(0, 8, 15),
      },
      {
        actorId: officer1.id,
        action: "INCIDENT_REPORTED",
        entityType: "Incident",
        entityId: incidentCritical.id,
        metadata: { severity: "CRITICAL", type: "Irrigation Main Line Burst" },
        createdAt: dateOffset(0, 7, 50),
      },
      {
        actorId: agronomist.id,
        action: "INCIDENT_FOLLOWUP",
        entityType: "Incident",
        entityId: incidentHigh.id,
        metadata: { prescription: "Copper oxychloride + Streptocycline" },
        createdAt: dateOffset(-1, 16, 45),
      },
    ],
  });

  console.log("✓ Audit trail and governance records created.");

  console.log("\n==========================================================");
  console.log("🎉 SEEDING COMPLETE! THE PLATFORM IS 100% READY FOR THE DEMO.");
  console.log("==========================================================");
  console.log("Demo Credentials:");
  console.log("  • Super Admin:  admin@agaate.local      / LocalAdminPassword-ChangeMe-123");
  console.log("  • Farm Admin:   farmadmin@agaate.local  / LocalAdminPassword-ChangeMe-123");
  console.log("  • Agronomist:   agronomist@agaate.local / LocalAdminPassword-ChangeMe-123");
  console.log("  • Lead Officer: officer@agaate.local    / LocalAdminPassword-ChangeMe-123");
  console.log("  • Mandya Off.:  officer2@agaate.local   / LocalAdminPassword-ChangeMe-123");
  console.log("  • Nashik Off.:  officer3@agaate.local   / LocalAdminPassword-ChangeMe-123");
  console.log("==========================================================");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
