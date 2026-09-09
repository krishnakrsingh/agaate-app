import { PrismaClient, Role, FarmStatus, FarmSetupStage, PlotStatus } from "@prisma/client";

// Regional agricultural hubs across India
const REGIONS = [
  { state: "Karnataka", district: "Mandya", lat: 12.5218, lng: 76.8951, soil: "Deep River Silt & Loam", water: "Cauvery Canal + Drip Station" },
  { state: "Karnataka", district: "Kolar", lat: 13.1378, lng: 78.1292, soil: "Red Sandy Loam", water: "Deep Borewell 800ft + Rain Pond" },
  { state: "Karnataka", district: "Shimoga", lat: 13.9299, lng: 75.5681, soil: "Laterite Red Soil", water: "River Lift Irrigation + Sprinklers" },
  { state: "Karnataka", district: "Hassan", lat: 13.0033, lng: 76.1004, soil: "Red Clay Loam", water: "Stream Gravity Flow + Borewell" },
  { state: "Karnataka", district: "Belagavi", lat: 15.8497, lng: 74.4977, soil: "Black Basaltic Loam", water: "Malaprabha Canal Network" },
  { state: "Karnataka", district: "Chikkamagaluru", lat: 13.3161, lng: 75.772, soil: "Hill Loam with Rich Humus", water: "Perennial Mountain Stream" },
  { state: "Karnataka", district: "Mysuru", lat: 12.2958, lng: 76.6394, soil: "Alluvial Red Soil", water: "Kabini Canal + Borewells" },
  { state: "Tamil Nadu", district: "Krishnagiri", lat: 12.5186, lng: 78.2137, soil: "Red Sandy Loam (pH 6.5)", water: "2x 15HP Submersible Borewells" },
  { state: "Tamil Nadu", district: "Dharmapuri", lat: 12.1211, lng: 78.1582, soil: "Gravelly Red Loam", water: "Borewell + High Pressure Drip" },
  { state: "Tamil Nadu", district: "Coimbatore", lat: 11.0168, lng: 76.9558, soil: "Black Cotton & Clay Loam", water: "Bhavani River Feed + Storage Tank" },
  { state: "Tamil Nadu", district: "Dindigul", lat: 10.3673, lng: 77.9803, soil: "Alluvial Red Sandy Loam", water: "Open Irrigation Well + Solar Pump" },
  { state: "Tamil Nadu", district: "Nilgiris", lat: 11.4285, lng: 76.8652, soil: "Acidic Mountain Peat & Loam", water: "Natural Springs + Gravity Cistern" },
  { state: "Tamil Nadu", district: "Salem", lat: 11.6643, lng: 78.146, soil: "Deep Red Soil", water: "Mettur West Bank Canal" },
  { state: "Maharashtra", district: "Nashik", lat: 20.011, lng: 73.7903, soil: "Basaltic Loam with Gravel", water: "Godavari Basin Well + Auto Drip" },
  { state: "Maharashtra", district: "Pune", lat: 18.5204, lng: 73.8567, soil: "Medium Black Cotton Soil", water: "Mutha River Canal + Storage Reservoir" },
  { state: "Maharashtra", district: "Ahmednagar", lat: 19.0948, lng: 74.748, soil: "Deep Black Fertile Loam", water: "Pravara Canal + 20HP Borewells" },
  { state: "Maharashtra", district: "Sangli", lat: 16.8524, lng: 74.5815, soil: "Krishna Basin Alluvial Silt", water: "Automated Micro-Drip System" },
  { state: "Maharashtra", district: "Solapur", lat: 17.6599, lng: 75.9064, soil: "Medium Heavy Black Soil", water: "Ujani Dam Canal + Drip Filtration" },
  { state: "Andhra Pradesh", district: "Anantapur", lat: 14.6819, lng: 77.6006, soil: "Red Gravelly Soil (Low EC)", water: "Deep Borewell 950ft + Farm Pond" },
  { state: "Andhra Pradesh", district: "Chittoor", lat: 13.2172, lng: 79.1003, soil: "Red Sandy Loam", water: "Open Dug Well + Rainwater Catchment" },
  { state: "Andhra Pradesh", district: "Kurnool", lat: 15.8281, lng: 78.0373, soil: "Black Cotton Clay Loam", water: "Tungabhadra Canal Network" },
  { state: "Andhra Pradesh", district: "Guntur", lat: 16.3067, lng: 80.4365, soil: "Delta Alluvial Rich Soil", water: "Krishna River Lift Irrigation" },
  { state: "Telangana", district: "Rangareddy", lat: 17.385, lng: 78.4867, soil: "Red Chalky Loam (Chaluka)", water: "Twin Borewells + Reverse Osmosis Drip" },
  { state: "Telangana", district: "Warangal", lat: 17.9689, lng: 79.5941, soil: "Red Sandy Loam with Clay Subsoil", water: "Kakatiya Canal + Solar Pumping" },
  { state: "Gujarat", district: "Anand", lat: 22.5645, lng: 72.9289, soil: "Goradu Alluvial Sandy Loam", water: "Mahi Canal + Pressurized Network" },
  { state: "Gujarat", district: "Rajkot", lat: 22.3039, lng: 70.8022, soil: "Medium Black Basaltic Soil", water: "Bhadar Dam Pipeline + 15HP Well" },
  { state: "Gujarat", district: "Vadodara", lat: 22.3072, lng: 73.1812, soil: "Black Cotton Loam", water: "Narmada Main Canal Sub-distributary" },
  { state: "Punjab", district: "Ludhiana", lat: 30.901, lng: 75.8573, soil: "Fertile Alluvial Loam", water: "Sirhind Canal + Deep Tube Wells" },
  { state: "Punjab", district: "Bathinda", lat: 30.211, lng: 74.9455, soil: "Light Sandy Loam", water: "Kotla Canal Branch + High Discharge Bore" },
  { state: "Haryana", district: "Karnal", lat: 29.6857, lng: 76.9905, soil: "Old Alluvial Silt Loam", water: "Western Yamuna Canal" },
  { state: "Rajasthan", district: "Jaipur", lat: 26.9124, lng: 75.7873, soil: "Sandy Loam with High Porosity", water: "Tube Well Array + Water Recharge Shaft" },
  { state: "Rajasthan", district: "Kota", lat: 25.2138, lng: 75.8648, soil: "Deep Clay Loam", water: "Chambal Right Main Canal" },
  { state: "Madhya Pradesh", district: "Indore", lat: 22.7196, lng: 75.8577, soil: "Malwa Plateau Black Soil", water: "Narmada-Kshipra Link Pipeline" },
  { state: "Kerala", district: "Wayanad", lat: 11.6854, lng: 76.132, soil: "Forest Loam & Humus", water: "Natural Stream Gravity System" },
  { state: "Uttar Pradesh", district: "Varanasi", lat: 25.3176, lng: 82.9739, soil: "Gangetic Alluvial Silt", water: "Ganga River Lift Irrigation Canal" },
];

const FIRST_NAMES = [
  "Ramesh", "Suresh", "Vikram", "Rajesh", "Prakash", "Anand", "Mahesh", "Vijay", "Sunil", "Ashok",
  "Dinesh", "Kishore", "Sanjay", "Manoj", "Ajay", "Pradeep", "Satish", "Mohan", "Gopal", "Vinod",
  "Pooja", "Sunita", "Anita", "Deepa", "Kavita", "Radha", "Rekha", "Shalini", "Meena", "Geeta",
  "Arjun", "Devendra", "Ravindra", "Harish", "Hemant", "Naveen", "Girish", "Chetan", "Manish", "Gautam",
  "Harpreet", "Gurpreet", "Jaswinder", "Balwinder", "Amandeep", "Kuldeep", "Manpreet", "Sukhwinder"
];

const LAST_NAMES = [
  "Sharma", "Patel", "Reddy", "Deshmukh", "Rao", "Gowda", "Singh", "Verma", "Naidu", "Choudhury",
  "Hegde", "Nair", "Joshi", "Kulkarni", "Mehta", "Banerjee", "Patil", "Bhatt", "Pillai", "Yadav",
  "Chauhan", "Rathore", "Menon", "Shenoy", "Iyer", "Shinde", "Bhosale", "Solanki", "Jadeja", "Chawla",
  "Gill", "Dhillon", "Sandhu", "Brar", "Grewal", "Mann", "Sidhu", "Khatri", "Pawar", "Kadam"
];

const BIZ_SUFFIXES = [
  "Agro Farms", "Greenhouses", "Orchards", "Estates", "Bio-Farms", "Plantations",
  "Horticulture", "Agritech", "Precision Agro", "Organic Farms", "Fresh Produce", "Agrifoods",
  "Highland Estates", "Valley Farms", "Flora & Farms", "Commercial Cultivations"
];

const ENTITY_TYPES = ["INDIVIDUAL", "PVT_LTD", "PARTNERSHIP", "HUF", "TRUST"];

async function chunkedInsert<T>(
  name: string,
  items: T[],
  chunkSize: number,
  insertFn: (chunk: T[]) => Promise<any>
) {
  const t0 = Date.now();
  console.log(`  -> Inserting ${items.length.toLocaleString()} ${name} in chunks of ${chunkSize}...`);
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    await insertFn(chunk);
    const progress = Math.min(100, Math.round(((i + chunk.length) / items.length) * 100));
    process.stdout.write(`\r     Progress: ${progress}% (${(i + chunk.length).toLocaleString()} / ${items.length.toLocaleString()})`);
  }
  const durSec = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`\n  ✓ Successfully seeded ${items.length.toLocaleString()} ${name} in ${durSec}s.`);
}

export async function seedScalablePortfolio(
  prisma: PrismaClient,
  passwordHash: string,
  targetClients: number = 10000
) {
  console.log(`\n[SCALABILITY ENGINE] Generating ${targetClients.toLocaleString()} clients and multi-farm estates...`);
  const tGenStart = Date.now();

  const nowMs = Date.now();
  const clientsData: any[] = [];
  const usersData: any[] = [];
  const farmsData: any[] = [];
  const farmAccessData: any[] = [];
  const plotsData: any[] = [];

  for (let i = 1; i <= targetClients; i++) {
    const codeNum = String(i).padStart(5, "0");
    const clientId = `cli-scale-${codeNum}`;
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(i * 3 + Math.floor(i / 100)) % LAST_NAMES.length];
    const fullName = `${firstName} ${lastName}`;
    const bizSuffix = BIZ_SUFFIXES[(i * 7) % BIZ_SUFFIXES.length];
    const entityType = ENTITY_TYPES[i % 10 < 5 ? 0 : i % 10 < 8 ? 1 : i % 10 === 8 ? 2 : 3];
    const companyName =
      entityType === "INDIVIDUAL"
        ? (i % 3 === 0 ? `${lastName} ${bizSuffix}` : null)
        : `${lastName} ${bizSuffix} ${entityType === "PVT_LTD" ? "Pvt Ltd" : entityType === "PARTNERSHIP" ? "LLP" : ""}`.trim();
    const region = REGIONS[i % REGIONS.length];
    const status = i % 100 < 88 ? "ACTIVE" : i % 100 < 96 ? "INACTIVE" : "SUSPENDED";

    // Distributed creation timestamps across past 365 days
    const daysAgo = (i * 31) % 365;
    const createdAt = new Date(nowMs - daysAgo * 86400000 - ((i * 17) % 86400) * 1000);
    const clientPhone = `+9198${String(10000000 + i).slice(-8)}`;
    const clientEmail = `client.${codeNum}@agaate.local`;

    clientsData.push({
      id: clientId,
      code: `CLI-${codeNum}`,
      name: fullName,
      companyName,
      entityType,
      email: clientEmail,
      phone: clientPhone,
      state: region.state,
      district: region.district,
      address: `Survey No. ${10 + (i % 250)}, ${region.district} Rural, ${region.state}`,
      status,
      createdAt,
      updatedAt: createdAt,
    });

    // Client Owner User account (FARM_ADMIN)
    const userId = `usr-client-${codeNum}`;
    const userPhone = `+9197${String(10000000 + i).slice(-8)}`;
    usersData.push({
      id: userId,
      name: fullName,
      email: `owner.${codeNum}@agaate.local`,
      phone: userPhone,
      passwordHash,
      role: Role.FARM_ADMIN,
      active: status === "ACTIVE",
      clientId,
      createdAt,
      updatedAt: createdAt,
    });

    // Farms per client: 60% have 2, 30% have 3, 10% have 4 -> Exactly 25,000 farms for 10,000 clients!
    const farmCount = (i % 10 < 6) ? 2 : (i % 10 < 9) ? 3 : 4;

    for (let f = 1; f <= farmCount; f++) {
      const farmId = `farm-scale-${codeNum}-${f}`;
      const farmRegion = REGIONS[(i + f * 5) % REGIONS.length];
      const jitterLat = Number(((i % 100 - 50) * 0.005).toFixed(6));
      const jitterLng = Number(((f % 100 - 50) * 0.005).toFixed(6));
      const totalArea = Number((12 + ((i * 7 + f * 11) % 78)).toFixed(1));
      const cultivableArea = Number((totalArea * (0.85 + (f % 10) * 0.01)).toFixed(1));

      // Realistic pipeline setup vs active distribution
      // 65% ACTIVE (HANDED_OVER), 25% SETUP, 8% INACTIVE, 2% COMPLETED
      const farmDice = (i * 3 + f) % 100;
      let farmStatus: FarmStatus = FarmStatus.ACTIVE;
      let setupStage: FarmSetupStage = FarmSetupStage.HANDED_OVER;
      let setupProgress = 100;
      let handedOverAt: Date | null = new Date(createdAt.getTime() + Math.min(30, Math.max(5, daysAgo - 10)) * 86400000);

      if (farmDice < 25) {
        farmStatus = FarmStatus.SETUP;
        handedOverAt = null;
        const stagePick = (i + f) % 4;
        if (stagePick === 0) {
          setupStage = FarmSetupStage.SURVEY_SOIL_TEST;
          setupProgress = 20;
        } else if (stagePick === 1) {
          setupStage = FarmSetupStage.PLOT_DEMARCATION;
          setupProgress = 40;
        } else if (stagePick === 2) {
          setupStage = FarmSetupStage.BED_SOIL_PREP;
          setupProgress = 60;
        } else {
          setupStage = FarmSetupStage.IRRIGATION_LAYOUT;
          setupProgress = 80;
        }
      } else if (farmDice < 33) {
        farmStatus = FarmStatus.INACTIVE;
        setupStage = FarmSetupStage.SURVEY_SOIL_TEST;
        setupProgress = 15;
        handedOverAt = null;
      } else if (farmDice < 35) {
        farmStatus = FarmStatus.COMPLETED;
        setupStage = FarmSetupStage.HANDED_OVER;
        setupProgress = 100;
      }

      const farmName = `${lastName} ${bizSuffix.split(" ")[0]} - Parcel ${f} (${farmRegion.district})`;

      farmsData.push({
        id: farmId,
        clientId,
        name: farmName,
        ownerName: fullName,
        clientPhone,
        location: `${farmRegion.district}, ${farmRegion.state}`,
        address: `Survey No. ${100 + ((i * 3 + f * 7) % 400)}, Taluk ${farmRegion.district}`,
        surveyNumber: `Sy. ${100 + ((i * 3 + f * 7) % 400)}/${f}`,
        village: `${farmRegion.district} Rural`,
        taluk: farmRegion.district,
        district: farmRegion.district,
        state: farmRegion.state,
        latitude: farmRegion.lat + jitterLat,
        longitude: farmRegion.lng + jitterLng,
        totalArea,
        cultivableArea,
        waterSource: farmRegion.water,
        soilType: farmRegion.soil,
        status: farmStatus,
        setupStage,
        setupProgress,
        handedOverAt,
        geofenceRadiusMeters: 500 + ((i + f) % 5) * 100,
        createdAt,
        updatedAt: new Date(createdAt.getTime() + 86400000),
      });

      // Farm Access for the client owner
      farmAccessData.push({
        id: `acc-scale-${codeNum}-${f}`,
        userId,
        farmId,
        canManage: true,
        createdAt,
      });

      // 1 to 2 plots per farm (1 plot for 60%, 2 plots for 40% -> Exactly 35,000 plots!)
      const plotCount = (i + f) % 5 < 3 ? 1 : 2;
      for (let p = 1; p <= plotCount; p++) {
        const plotArea = Number((cultivableArea / plotCount).toFixed(1));
        plotsData.push({
          id: `plt-scale-${codeNum}-${f}-${p}`,
          farmId,
          name: plotCount === 1 ? "Plot 1 - Commercial Precision Bay" : `Plot ${p} - ${p === 1 ? "North Cultivation Bay" : "South Open Block"}`,
          area: plotArea,
          latitude: farmRegion.lat + jitterLat + p * 0.0008,
          longitude: farmRegion.lng + jitterLng + p * 0.0008,
          soilType: farmRegion.soil,
          status: farmStatus === FarmStatus.ACTIVE ? PlotStatus.ACTIVE : PlotStatus.SETUP,
          createdAt,
          updatedAt: createdAt,
        });
      }
    }
  }

  console.log(`  ✓ In-memory payload constructed in ${((Date.now() - tGenStart) / 1000).toFixed(2)}s:`);
  console.log(`    • Clients:     ${clientsData.length.toLocaleString()}`);
  console.log(`    • Owner Users: ${usersData.length.toLocaleString()}`);
  console.log(`    • Farms:       ${farmsData.length.toLocaleString()}`);
  console.log(`    • Farm Access: ${farmAccessData.length.toLocaleString()}`);
  console.log(`    • Plots:       ${plotsData.length.toLocaleString()}`);

  // High-performance batch insertions
  await chunkedInsert("Clients", clientsData, 2000, (chunk) =>
    prisma.client.createMany({ data: chunk })
  );

  await chunkedInsert("Owner Users", usersData, 2000, (chunk) =>
    prisma.user.createMany({ data: chunk })
  );

  await chunkedInsert("Farms", farmsData, 2500, (chunk) =>
    prisma.farm.createMany({ data: chunk })
  );

  await chunkedInsert("Farm Access Links", farmAccessData, 2500, (chunk) =>
    prisma.farmAccess.createMany({ data: chunk })
  );

  await chunkedInsert("Plots", plotsData, 2500, (chunk) =>
    prisma.plot.createMany({ data: chunk })
  );

  const totalSec = ((Date.now() - tGenStart) / 1000).toFixed(2);
  console.log(`\n⭐ [SCALABILITY SEED COMPLETED] All ${clientsData.length.toLocaleString()} clients and ${farmsData.length.toLocaleString()} estates successfully seeded in ${totalSec}s!\n`);
}
