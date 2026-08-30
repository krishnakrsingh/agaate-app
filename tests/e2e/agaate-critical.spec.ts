import { test, expect } from "@playwright/test";
import bcrypt from "bcryptjs";
import { prisma } from "../../src/lib/prisma";

const timestamp = Date.now();
const testPassword = "E2ESecurePassword123!";

const users = {
  superAdmin: { name: "E2E Super Admin", email: `e2e.admin.${timestamp}@test.agaate.local`, role: "SUPER_ADMIN" as const },
  farmAdmin: { name: "E2E Farm Admin", email: `e2e.fa.${timestamp}@test.agaate.local`, role: "FARM_ADMIN" as const },
  agronomist: { name: "E2E Agronomist", email: `e2e.agro.${timestamp}@test.agaate.local`, role: "AGRONOMIST" as const },
  officerA: { name: "E2E Officer A", email: `e2e.officera.${timestamp}@test.agaate.local`, role: "FARM_OFFICER" as const },
  officerB: { name: "E2E Officer B", email: `e2e.officerb.${timestamp}@test.agaate.local`, role: "FARM_OFFICER" as const },
};

let createdFarmId: string = "";

test.describe.serial("AGAATE Real Browser E2E Acceptance Suite", () => {
  test.beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);

    for (const u of Object.values(users)) {
      await prisma.user.upsert({
        where: { email: u.email },
        update: { active: true, passwordHash },
        create: { name: u.name, email: u.email, passwordHash, role: u.role, active: true },
      });
    }
  });

  test.afterAll(async () => {
    const emails = Object.values(users).map((u) => u.email);
    const testUsers = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
    const userIds = testUsers.map((u) => u.id);

    if (userIds.length) {
      await prisma.mediaAsset.deleteMany({ where: { uploadedById: { in: userIds } } });
      await prisma.taskExecution.deleteMany({ where: { officerId: { in: userIds } } });
      await prisma.task.deleteMany({ where: { createdById: { in: userIds } } });
      await prisma.cropMonitoring.deleteMany({ where: { officerId: { in: userIds } } });
      await prisma.incident.deleteMany({ where: { reporterId: { in: userIds } } });
      await prisma.attendance.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.farmAccess.deleteMany({ where: { userId: { in: userIds } } });
      if (createdFarmId) {
        await prisma.agronomyPlan.deleteMany({ where: { farmId: createdFarmId } });
        await prisma.locationChangeRequest.deleteMany({ where: { farmId: createdFarmId } });
        await prisma.cropCycle.deleteMany({ where: { plot: { farmId: createdFarmId } } });
        await prisma.plot.deleteMany({ where: { farmId: createdFarmId } });
        await prisma.farm.deleteMany({ where: { id: createdFarmId } });
      }
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    }
  });

  // -------------------------------------------------------------------------
  // 1. AUTHENTICATION & LOGIN UI TEST
  // -------------------------------------------------------------------------
  test("1. Login Screen validation, error handling, and successful login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");

    // Check page brand
    await expect(page.locator("body")).toContainText("AGAATE");

    // Test invalid password -> 401 error displayed
    await page.fill('input[name="email"]', users.farmAdmin.email);
    await page.fill('input[name="password"]', "WrongPassword123!");
    await page.click('button[type="submit"]');

    await expect(page.locator("div.error")).toBeVisible();
    await expect(page.locator("div.error")).toContainText("Invalid email or password");

    // Test valid login
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard for Farm Admin
    await expect(page).toHaveURL(/.*dashboard.*/);
    await expect(page.locator("body")).toContainText(users.farmAdmin.name);
  });

  // -------------------------------------------------------------------------
  // 2. FARM ADMIN JOURNEY: CREATE FARM -> PLOT -> CROP -> ACTIVATE
  // -------------------------------------------------------------------------
  test("2. Farm Admin Journey: Create Farm, Plot, Crop Cycle, and Activate Farm", async ({ page }) => {
    // 1. Login as Farm Admin
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('input[name="email"]', users.farmAdmin.email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard.*/);

    // 2. Open New Farm Page
    await page.goto("/farms/new");
    await expect(page.locator("body")).toContainText("Setup New Farm Property");

    const farmName = `E2E Precision Estate ${timestamp}`;
    await page.fill('input[name="name"]', farmName);
    await page.fill('input[name="ownerName"]', "Narayana Swamy");
    await page.fill('input[name="location"]', "Hosur, Tamil Nadu");
    await page.fill('input[name="waterSource"]', "2x 20HP Borewells");
    await page.fill('input[name="latitude"]', "12.9716");
    await page.fill('input[name="longitude"]', "77.5946");
    await page.fill('input[name="totalArea"]', "12.0");
    await page.fill('input[name="cultivableArea"]', "10.0");
    await page.fill('input[name="geofenceRadiusMeters"]', "600");

    await page.click('button[type="submit"]');

    // Should navigate to the farm hub page
    await expect(page).toHaveURL(/.*farms\/cm.*/);
    const url = page.url();
    createdFarmId = url.split("/farms/")[1].split(/[?#]/)[0];
    expect(createdFarmId).toBeTruthy();

    await expect(page.locator("h1")).toContainText(farmName);
    await expect(page.locator("body")).toContainText("SETUP");

    // 3. Click "Create New Plot" button
    await page.click('button:has-text("Create New Plot")');

    // Fill Plot Form
    await page.fill('input[name="name"]', "North Block 1");
    await page.fill('input[name="area"]', "4.0");
    await page.fill('input[name="latitude"]', "12.9716");
    await page.fill('input[name="longitude"]', "77.5946");
    await page.fill('input[name="soilType"]', "Red Sandy Loam");

    await page.click('button[type="submit"]:has-text("Save Plot to Farm")');

    // Wait for plot card to appear
    await expect(page.locator("body")).toContainText("North Block 1");
    await expect(page.locator("body")).toContainText("4 Acres");

    // 4. Navigate to Crop Cycle Planning Wizard
    await page.click('a:has-text("Plan Crop")');
    await expect(page.locator("body")).toContainText("Plan Crop Cycle");

    // Step 1: Crop & Varieties
    await page.fill('input[placeholder*="Watermelon"]', "Watermelon");
    await page.fill('input[placeholder*="Arka Manik"]', "Arka Manik, Sugar Baby, Black Magic");
    await page.click('button:has-text("Continue")');

    // Step 2: Establishment Method
    await page.click('strong:has-text("Nursery Transplantation")');
    await page.click('button:has-text("Continue")');

    // Step 3: Infrastructure (Bed Prep + Mulch)
    const bedCheck = page.locator('input[type="checkbox"]').first();
    if (!(await bedCheck.isChecked())) {
      await bedCheck.check();
    }
    await page.fill('input[placeholder="e.g., 200"]', "100");

    const mulchCheck = page.locator('input[type="checkbox"]').nth(1);
    if (!(await mulchCheck.isChecked())) {
      await mulchCheck.check();
    }
    await page.fill('input[placeholder="e.g., 4500"]', "4000");
    await page.fill('input[placeholder="e.g., 45"]', "45");

    await page.click('button:has-text("Continue")');

    // Step 4: Milestones (pre-filled with 4 milestones)
    await page.click('button:has-text("Continue")');

    // Step 5: Review & Confirm
    await page.click('button:has-text("Confirm & Launch Cycle")');

    // Should return to farm hub and show Watermelon
    await expect(page).toHaveURL(new RegExp(`.*farms/${createdFarmId}.*`));
    await expect(page.locator("body")).toContainText("Watermelon");

    // 5. Activate Farm Estate
    const activateBtn = page.locator('button:has-text("Activate Farm")').first();
    await expect(activateBtn).toBeVisible();
    await activateBtn.click();

    // Confirm activation status
    await expect(page.locator("body")).toContainText("ACTIVE");

    // 6. Assign Officer A
    const officerUser = await prisma.user.findUniqueOrThrow({ where: { email: users.officerA.email } });
    await prisma.farmAccess.upsert({
      where: { userId_farmId: { userId: officerUser.id, farmId: createdFarmId } },
      update: {},
      create: { userId: officerUser.id, farmId: createdFarmId, canManage: false },
    });
  });

  // -------------------------------------------------------------------------
  // 3. AGRONOMIST PLANNING & TASK CREATION
  // -------------------------------------------------------------------------
  test("3. Agronomist Planning: Create rolling task and assign to Officer A", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('input[name="email"]', users.agronomist.email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    
    // Agronomist lands on /tasks or /dashboard
    await expect(page).toHaveURL(/.*(tasks|dashboard).*/);

    // Navigate to tasks/new
    await page.goto("/tasks/new");
    await expect(page.locator("body")).toContainText("Schedule Agronomy Activity");

    // Select Farm
    await page.selectOption('select[name="farmId"]', createdFarmId);
    await page.waitForTimeout(500);

    const todayStr = new Date().toISOString().slice(0, 10);
    await page.fill('input[name="title"]', "Morning Drip Fertigation NPK 19:19:19");
    await page.fill('textarea[name="description"]', "Inject 10kg water soluble NPK through drip lateral");
    await page.fill('input[name="date"]', todayStr);

    // Select Officer A
    const officerUser = await prisma.user.findUniqueOrThrow({ where: { email: users.officerA.email } });
    await page.selectOption('select[name="assignedOfficerId"]', officerUser.id);

    await page.click('button[type="submit"]:has-text("Assign & Publish to Field Queue")');

    // Should redirect to tasks page
    await expect(page).toHaveURL(/.*tasks.*/);
    await expect(page.locator("body")).toContainText("Morning Drip Fertigation");
  });

  // -------------------------------------------------------------------------
  // 4. CROSS-ROLE ISOLATION: OFFICER A vs OFFICER B
  // -------------------------------------------------------------------------
  test("4. Cross-Role Isolation: Officer A sees task, Officer B has empty queue", async ({ page }) => {
    // 1. Officer A logs in -> task is present
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('input[name="email"]', users.officerA.email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(officer\/day|dashboard).*/);

    await page.goto("/officer/day");
    await expect(page.locator("body")).toContainText("Morning Drip Fertigation");

    // 2. Officer B logs in -> task is NOT present
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('input[name="email"]', users.officerB.email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(officer\/day|dashboard).*/);

    await page.goto("/officer/day");
    await expect(page.locator("body")).not.toContainText("Morning Drip Fertigation");
  });

  // -------------------------------------------------------------------------
  // 5. FIELD OFFICER EXECUTION WORKFLOW
  // -------------------------------------------------------------------------
  test("5. Officer Execution: Clock-in with selfie -> Start Task -> Log Labour & Materials -> Complete -> Clock-out", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('input[name="email"]', users.officerA.email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*(officer\/day|dashboard).*/);

    await page.goto("/officer/day");

    // 1. Clock In: Select Farm & Attach Selfie File
    await page.selectOption('select', createdFarmId);

    const buffer = Buffer.from("e2e-test-selfie-image-data-payload");
    await page.setInputFiles('input[type="file"]', {
      name: "selfie.jpg",
      mimeType: "image/jpeg",
      buffer,
    });

    await page.click('button[type="submit"]:has-text("Clock In")');

    // Verify On Duty banner appears
    await expect(page.locator("body")).toContainText("ON DUTY");

    // 2. Start Morning Drip Fertigation Task
    const taskCard = page.locator(".card", { hasText: "Morning Drip Fertigation" });
    await expect(taskCard).toBeVisible();

    const startTaskBtn = taskCard.locator('button:has-text("Start Activity")');
    await expect(startTaskBtn).toBeVisible();
    await startTaskBtn.click();
    await expect(taskCard).toContainText("IN PROGRESS");

    // 3. Complete Task with Labour & Materials
    const recordBtn = taskCard.locator('button:has-text("Record Completion")');
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    await taskCard.locator('textarea[name="remarks"]').fill("Fertigation completed at 3.0 bar pressure");
    await taskCard.locator('input[name="materialName"]').fill("NPK 19:19:19");
    await taskCard.locator('input[name="quantity"]').fill("10");
    await taskCard.locator('input[name="unit"]').fill("kg");

    await taskCard.locator('input[name="labourers"]').fill("4");
    await taskCard.locator('input[name="hours"]').fill("5");

    await taskCard.locator('button[type="submit"]:has-text("Complete Activity")').click();
    await expect(taskCard).toContainText("COMPLETED");

    // 4. Submit Field Crop Monitoring Report
    await page.goto("/officer/reports");
    await expect(page.locator("body")).toContainText("Daily Crop Health & Stage Capture");

    await page.waitForTimeout(500);

    const cropPhotoBuffer = Buffer.from("e2e-crop-photo-data-payload");
    await page.setInputFiles('input[type="file"]', {
      name: "crop-observation.jpg",
      mimeType: "image/jpeg",
      buffer: cropPhotoBuffer,
    });

    await page.fill('textarea[name="remarks"]', "Vigorous crop canopy with zero pest incidence");
    await page.click('button[type="submit"]:has-text("Submit Daily Monitoring")');

    await expect(page.locator("body")).toContainText("Daily crop monitoring update recorded");

    // 5. End Field Shift
    await page.goto("/officer/day");
    const endShiftToggle = page.locator('button:has-text("End Shift")').first();
    await endShiftToggle.click();

    await page.setInputFiles('input[type="file"]', {
      name: "departure-selfie.jpg",
      mimeType: "image/jpeg",
      buffer,
    });

    await page.click('button[type="submit"]:has-text("Confirm End of Shift")');
    await expect(page.locator("body")).toContainText("Today's Field Shift Completed");
  });

  // -------------------------------------------------------------------------
  // 6. DAILY OPERATIONS REPORT GROUND TRUTH
  // -------------------------------------------------------------------------
  test("6. Daily Operations Report: Verify persisted database telemetry matches report view", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('input[name="email"]', users.farmAdmin.email);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard.*/);

    const todayStr = new Date().toISOString().slice(0, 10);
    await page.goto(`/reports/daily?farmId=${createdFarmId}&date=${todayStr}`);

    await expect(page.locator("body")).toContainText("Daily Operations Report");
    await expect(page.locator("body")).toContainText("NPK 19:19:19");
    await expect(page.locator("body")).toContainText("20 Man-Hours");
    await expect(page.locator("body")).toContainText("Vigorous crop canopy with zero pest incidence");
  });
});
