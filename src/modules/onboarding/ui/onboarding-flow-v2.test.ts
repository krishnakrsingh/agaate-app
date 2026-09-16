import { describe, it, expect } from "vitest";
import {
  clientSchema,
  contactsSchema,
  farmSchema,
  plotSchema,
  cropSchema,
  teamSchema,
  submitSchema,
} from "./onboarding-schema";
import { emptyWizard, emptyFarm, emptyPlot, emptyCrop } from "./onboarding-draft";

describe("Phase 1 Airbnb-Style Onboarding Flow — Step Validations", () => {
  it("Step 1: validates client information with Indian phone and WhatsApp toggle", () => {
    const validClient = {
      name: "Siddharth Rao",
      phone: "+91 98450 12345",
      whatsappNo: "+91 98450 12345",
      email: "siddharth.rao@greenleaf.com",
      companyName: "Greenleaf Agrotech Pvt Ltd",
      gstin: "29AAAAA0000A1Z5",
      village: "Doddaballapur",
      city: "Bengaluru Rural",
      state: "Karnataka",
      pincode: "561203",
      billingAddress: "Greenleaf HQ, Plot 14, Industrial Area",
    };

    const parsed = clientSchema.safeParse(validClient);
    expect(parsed.success).toBe(true);
  });

  it("Step 2: validates client contacts with Finance Connect & Purchaser Connect", () => {
    const validContacts = {
      financeContact: {
        name: "Anil Kulkarni",
        phone: "9845022334",
        email: "anil.k@greenleaf.com",
        role: "FINANCE" as const,
      },
      purchaserContact: {
        name: "Meera Nair",
        phone: "9845033445",
        email: "meera.n@greenleaf.com",
        role: "PURCHASER" as const,
      },
      additionalContacts: [],
    };

    const parsed = contactsSchema.safeParse(validContacts);
    expect(parsed.success).toBe(true);
  });

  it("Step 3: validates farm addition with area units, local connect, and address", () => {
    const validFarm = {
      name: "Greenleaf Valley Estate",
      area: 25.5,
      areaUnit: "Acre" as const,
      totalArea: 25.5,
      cultivableArea: 22.0,
      localConnect: "Siddharth Rao (+91 98450 12345)",
      localConnectSameAsClient: true,
      location: "Near Ghati Subramanya, Doddaballapur",
      latitude: 13.2954,
      longitude: 77.5387,
      waterSource: "2 Borewells + Rainwater Lake",
      surveyNumber: "78/1A",
      village: "Doddaballapur",
      city: "Bengaluru Rural",
      state: "Karnataka",
      pincode: "561203",
      soilType: "Red Sandy Loam",
    };

    const parsed = farmSchema.safeParse(validFarm);
    expect(parsed.success).toBe(true);
  });

  it("Step 4: validates plot addition with irrigation setup, valves, bed details, and land preparation", () => {
    const validPlot = {
      farmRowId: "farm-1",
      name: "Plot 01 — North Ridge",
      area: 5.0,
      soilType: "Red Sandy Loam",
      irrigationSetup: "Inline Drip (16mm, 40cm dripper spacing)",
      valves: "3 Sub-main Solenoid Valves",
      bedDetails: "1.2m Raised Beds with 40cm Furrows",
      landPrepStatus: "Beds Formed & Basal Dose Applied",
    };

    const parsed = plotSchema.safeParse(validPlot);
    expect(parsed.success).toBe(true);
  });

  it("Step 5: validates crop addition with planting method, spacing, basal dose, and mulching", () => {
    const validCrop = {
      plotRowId: "plot-1",
      cropName: "Tomato (Arka Rakshak)",
      plantingMethod: "Nursery Transplantation",
      spacing: "60cm x 45cm",
      basalDose: "10 MT FYM + DAP 50kg + MOP 25kg / acre",
      mulching: "Silver-Black 25 Micron Embossed",
      plantingDate: "2026-10-01",
      expectedHarvestDate: "2027-01-15",
      keyDates: "Staking on Day 25, First harvest window Day 75-105",
    };

    const parsed = cropSchema.safeParse(validCrop);
    expect(parsed.success).toBe(true);
  });

  it("Step 6: validates team assignment with agronomist, field officer, and first task provisioning", () => {
    const validTeam = {
      mode: "later" as const,
      agronomistId: "agr_1",
      agronomistName: "Dr. Ananya Rao",
      fieldOfficerId: "fo_1",
      fieldOfficerName: "Sanjay Kumar",
      createFirstTask: true,
      firstTaskTitle: "Initial Demarcation & Soil Testing",
    };

    const parsed = teamSchema.safeParse(validTeam);
    expect(parsed.success).toBe(true);
  });

  it("Submits entire Phase 1 onboarding payload through submitSchema", () => {
    const fullPayload = {
      idempotencyKey: "test-onboarding-phase1-full-uuid",
      client: {
        name: "Siddharth Rao",
        phone: "9845012345",
        whatsappNo: "9845012345",
        email: "siddharth.rao@greenleaf.com",
        companyName: "Greenleaf Agrotech Pvt Ltd",
        gstin: "29AAAAA0000A1Z5",
        village: "Doddaballapur",
        city: "Bengaluru Rural",
        state: "Karnataka",
        pincode: "561203",
        billingAddress: "Greenleaf HQ, Doddaballapur",
      },
      contacts: {
        financeContact: {
          name: "Anil Kulkarni",
          phone: "9845022334",
          email: "anil.k@greenleaf.com",
          role: "FINANCE" as const,
        },
        purchaserContact: {
          name: "Meera Nair",
          phone: "9845033445",
          email: "meera.n@greenleaf.com",
          role: "PURCHASER" as const,
        },
        additionalContacts: [],
      },
      farms: [
        {
          rowId: "farm-1",
          name: "Greenleaf Valley Estate",
          area: 25.5,
          areaUnit: "Acre" as const,
          totalArea: 25.5,
          cultivableArea: 22.0,
          localConnect: "Siddharth Rao (9845012345)",
          localConnectSameAsClient: true,
          location: "Doddaballapur, Bengaluru",
          latitude: 13.2954,
          longitude: 77.5387,
          waterSource: "Borewell",
          village: "Doddaballapur",
          city: "Bengaluru Rural",
          state: "Karnataka",
          pincode: "561203",
          soilType: "Red Sandy Loam",
        },
      ],
      plots: [
        {
          rowId: "plot-1",
          farmRowId: "farm-1",
          name: "Plot 01 — North Ridge",
          area: 5.0,
          soilType: "Red Sandy Loam",
          irrigationSetup: "Inline Drip",
          valves: "3 Valves",
          bedDetails: "1.2m Raised Beds",
          landPrepStatus: "Beds Formed & Ready",
        },
      ],
      crops: [
        {
          rowId: "crop-1",
          plotRowId: "plot-1",
          cropName: "Tomato (Arka Rakshak)",
          plantingMethod: "Transplantation",
          spacing: "60cm x 45cm",
          basalDose: "10 MT FYM / acre",
          mulching: "Silver-Black 25 Micron",
          plantingDate: "2026-10-01",
          expectedHarvestDate: "2027-01-15",
        },
      ],
      team: {
        mode: "later" as const,
        agronomistId: "agr_1",
        agronomistName: "Dr. Ananya Rao",
        fieldOfficerId: "fo_1",
        fieldOfficerName: "Sanjay Kumar",
        createFirstTask: true,
        firstTaskTitle: "Initial Demarcation & Soil Testing",
      },
    };

    const parsed = submitSchema.safeParse(fullPayload);
    expect(parsed.success).toBe(true);
  });
});
