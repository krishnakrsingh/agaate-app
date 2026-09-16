import { describe, it, expect } from "vitest";
import { clientSchema, farmSchema, submitSchema } from "./onboarding-schema";

describe("Onboarding Schema — Extended Client & Farm Fields", () => {
  it("validates clientSchema with full client details and contacts", () => {
    const validClient = {
      name: "Ramesh Patel",
      companyName: "Patel Organic Estates",
      phone: "+919876543210",
      whatsappNo: "+919876543210",
      email: "ramesh@patelorganics.in",
      panNumber: "ABCDE1234F",
      gstin: "29ABCDE1234F1Z5",
      billingAddress: "45 Agri Tech Park, Hoskote",
      village: "Solur",
      city: "Bengaluru",
      state: "Karnataka",
      district: "Bengaluru Rural",
      pincode: "562114",
      financeConnect: "Suresh Accounts (9876501234)",
      purchaserConnect: "Mahesh Procurement (9876504321)",
    };

    const parsed = clientSchema.safeParse(validClient);
    expect(parsed.success).toBe(true);
  });

  it("flags invalid whatsapp number if non-numeric or too short", () => {
    const invalidClient = {
      name: "Ramesh Patel",
      phone: "9876543210",
      whatsappNo: "123", // invalid length (<10 digits)
      email: "ramesh@patelorganics.in",
      billingAddress: "45 Agri Tech Park, Hoskote",
      village: "Solur",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "562114",
    };

    const parsed = clientSchema.safeParse(invalidClient);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some((i) => i.path.includes("whatsappNo"))).toBe(true);
    }
  });

  it("validates farmSchema with localConnect, city, pincode, soilType", () => {
    const validFarm = {
      name: "Patel North Estate",
      localConnect: "Ramesh Patel (+919876543210)",
      location: "Near Hoskote Lake",
      latitude: 13.0722,
      longitude: 77.7983,
      totalArea: 15.5,
      cultivableArea: 12.0,
      waterSource: "Borewell + Canal",
      surveyNumber: "104/2B",
      village: "Solur",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "562114",
      soilType: "Red Sandy Loam",
    };

    const parsed = farmSchema.safeParse(validFarm);
    expect(parsed.success).toBe(true);
  });

  it("submits whole wizard data cleanly with the new fields", () => {
    const wizardPayload = {
      idempotencyKey: "test-key-12345678",
      client: {
        name: "Ramesh Patel",
        phone: "9876543210",
        whatsappNo: "9876543210",
        email: "ramesh@patelorganics.in",
        billingAddress: "45 Agri Tech Park, Hoskote",
        village: "Solur",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "562114",
        financeConnect: "Priya Sharma (9876501234)",
        purchaserConnect: "Arun Verma (9876504321)",
      },
      contacts: {
        financeContact: {
          name: "Priya Sharma",
          phone: "9876501234",
          email: "priya@patelorganics.in",
          role: "FINANCE" as const,
        },
        purchaserContact: {
          name: "Arun Verma",
          phone: "9876504321",
          email: "arun@patelorganics.in",
          role: "PURCHASER" as const,
        },
        additionalContacts: [],
      },
      farms: [
        {
          rowId: "farm-1",
          name: "Patel Organic Farm",
          localConnect: "Ramesh Patel (9876543210)",
          location: "Solur, Bengaluru, Karnataka",
          latitude: 13.0,
          longitude: 77.5,
          totalArea: 10,
          cultivableArea: 10,
          waterSource: "Borewell",
          village: "Solur",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "562114",
          soilType: "Red Sandy Loam",
        },
      ],
      plots: [],
      team: {
        mode: "later" as const,
        agronomistId: "agr_1",
        agronomistName: "Dr. Ananya Rao",
        fieldOfficerId: "fo_1",
        fieldOfficerName: "Sanjay Kumar",
      },
    };

    const parsed = submitSchema.safeParse(wizardPayload);
    expect(parsed.success).toBe(true);
  });
});
