-- =============================================================
-- agaate full schema — generated 2026-09-11 19:56
-- Run this on a fresh MySQL database to bring it fully up to date.
-- =============================================================
-- ---- 20260830181349_init_mysql ----
-- CreateTable
CREATE TABLE `User` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `role` ENUM('SUPER_ADMIN', 'FARM_ADMIN', 'AGRONOMIST', 'FARM_OFFICER') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `User_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Farm` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `ownerName` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `totalArea` DECIMAL(12, 2) NOT NULL,
    `cultivableArea` DECIMAL(12, 2) NOT NULL,
    `waterSource` VARCHAR(191) NOT NULL,
    `status` ENUM('SETUP', 'ACTIVE', 'INACTIVE', 'COMPLETED') NOT NULL DEFAULT 'SETUP',
    `geofenceRadiusMeters` INTEGER NOT NULL DEFAULT 500,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `FarmAccess` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `canManage` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `FarmAccess_farmId_idx`(`farmId`),
    UNIQUE INDEX `FarmAccess_userId_farmId_key`(`userId`, `farmId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plot` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `area` DECIMAL(12, 2) NOT NULL,
    `latitude` DECIMAL(10, 7) NOT NULL,
    `longitude` DECIMAL(10, 7) NOT NULL,
    `soilType` VARCHAR(191) NULL,
    `status` ENUM('SETUP', 'ACTIVE', 'INACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'SETUP',
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Plot_farmId_status_idx`(`farmId`, `status`),
    UNIQUE INDEX `Plot_farmId_name_key`(`farmId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IrrigationConfiguration` (
    `id` VARCHAR(191) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `details` VARCHAR(191) NULL,

    UNIQUE INDEX `IrrigationConfiguration_plotId_type_key`(`plotId`, `type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CropCycle` (
    `id` VARCHAR(191) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `cropName` VARCHAR(191) NOT NULL,
    `startDate` DATE NOT NULL,
    `expectedFirstHarvestDate` DATE NULL,
    `establishmentType` ENUM('NURSERY_TRANSPLANTATION', 'DIRECT_SOWING') NOT NULL,
    `status` ENUM('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PLANNED',
    `bedPreparationEnabled` BOOLEAN NOT NULL DEFAULT false,
    `bedWidthCm` DECIMAL(8, 2) NULL,
    `bedCenterDistanceCm` DECIMAL(8, 2) NULL,
    `expectedBedsPerAcre` DECIMAL(12, 2) NULL,
    `expectedTotalBeds` DECIMAL(12, 2) NULL,
    `actualBedsCreated` DECIMAL(12, 2) NULL,
    `mulchEnabled` BOOLEAN NOT NULL DEFAULT false,
    `mulchHolePattern` VARCHAR(191) NULL,
    `plantDistanceCm` DECIMAL(8, 2) NULL,
    `expectedPlantsPerAcre` DECIMAL(12, 2) NULL,
    `expectedPlants` DECIMAL(12, 2) NULL,
    `actualPlants` DECIMAL(12, 2) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CropCycle_plotId_status_idx`(`plotId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CropVariety` (
    `id` VARCHAR(191) NOT NULL,
    `cropCycleId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `CropVariety_cropCycleId_name_key`(`cropCycleId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Milestone` (
    `id` VARCHAR(191) NOT NULL,
    `cropCycleId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `targetDate` DATE NOT NULL,
    `status` ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED') NOT NULL DEFAULT 'PENDING',
    `remarks` VARCHAR(191) NULL,
    `completedAt` DATETIME(3) NULL,

    INDEX `Milestone_cropCycleId_targetDate_idx`(`cropCycleId`, `targetDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgronomyPlan` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `planDate` DATE NOT NULL,
    `notes` VARCHAR(191) NULL,
    `manualTemperature` DECIMAL(5, 2) NULL,
    `manualHumidity` DECIMAL(5, 2) NULL,
    `manualWindSpeed` DECIMAL(5, 2) NULL,
    `manualRainForecast` DECIMAL(5, 2) NULL,
    `manualWeatherRemarks` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AgronomyPlan_farmId_planDate_key`(`farmId`, `planDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Task` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `plotId` VARCHAR(191) NULL,
    `cropCycleId` VARCHAR(191) NULL,
    `milestoneId` VARCHAR(191) NULL,
    `planId` VARCHAR(191) NULL,
    `origin` ENUM('AGRONOMIST', 'SYSTEM', 'DAILY_MONITORING') NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `instructions` VARCHAR(191) NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'MEDIUM',
    `dueDate` DATE NOT NULL,
    `status` ENUM('DRAFT', 'ASSIGNED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED') NOT NULL DEFAULT 'DRAFT',
    `assignedOfficerId` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `Task_assignedOfficerId_dueDate_status_idx`(`assignedOfficerId`, `dueDate`, `status`),
    INDEX `Task_farmId_dueDate_idx`(`farmId`, `dueDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TaskExecution` (
    `id` VARCHAR(191) NOT NULL,
    `taskId` VARCHAR(191) NOT NULL,
    `officerId` VARCHAR(191) NOT NULL,
    `status` ENUM('DRAFT', 'ASSIGNED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'BLOCKED') NOT NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `remarks` VARCHAR(191) NULL,

    UNIQUE INDEX `TaskExecution_taskId_key`(`taskId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MaterialUsage` (
    `id` VARCHAR(191) NOT NULL,
    `executionId` VARCHAR(191) NOT NULL,
    `materialName` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LabourUsage` (
    `id` VARCHAR(191) NOT NULL,
    `executionId` VARCHAR(191) NOT NULL,
    `labourers` INTEGER NOT NULL,
    `hours` DECIMAL(8, 2) NOT NULL,
    `labourHours` DECIMAL(12, 2) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Attendance` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `attendanceDate` DATE NOT NULL,
    `status` ENUM('OPEN', 'COMPLETED', 'EXCEPTION_PENDING', 'EXCEPTION_APPROVED', 'EXCEPTION_REJECTED') NOT NULL DEFAULT 'OPEN',
    `startAt` DATETIME(3) NULL,
    `endAt` DATETIME(3) NULL,
    `startLatitude` DECIMAL(10, 7) NULL,
    `startLongitude` DECIMAL(10, 7) NULL,
    `endLatitude` DECIMAL(10, 7) NULL,
    `endLongitude` DECIMAL(10, 7) NULL,
    `startSelfieKey` VARCHAR(191) NULL,
    `endSelfieKey` VARCHAR(191) NULL,
    `exceptionReason` VARCHAR(191) NULL,

    UNIQUE INDEX `Attendance_userId_farmId_attendanceDate_key`(`userId`, `farmId`, `attendanceDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AttendanceException` (
    `id` VARCHAR(191) NOT NULL,
    `attendanceId` VARCHAR(191) NOT NULL,
    `distanceMeters` DECIMAL(12, 2) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,

    UNIQUE INDEX `AttendanceException_attendanceId_key`(`attendanceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `LocationChangeRequest` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `requesterId` VARCHAR(191) NOT NULL,
    `proposedLatitude` DECIMAL(10, 7) NOT NULL,
    `proposedLongitude` DECIMAL(10, 7) NOT NULL,
    `reason` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedById` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CropMonitoring` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `cropCycleId` VARCHAR(191) NOT NULL,
    `officerId` VARCHAR(191) NOT NULL,
    `status` ENUM('GOOD', 'POOR') NOT NULL,
    `stage` VARCHAR(191) NOT NULL,
    `impactPercent` DECIMAL(5, 2) NULL,
    `remarks` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Incident` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `plotId` VARCHAR(191) NULL,
    `cropCycleId` VARCHAR(191) NULL,
    `reporterId` VARCHAR(191) NOT NULL,
    `level` ENUM('FARM', 'PLOT', 'CROP') NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `severity` VARCHAR(191) NULL,
    `impactPercent` DECIMAL(5, 2) NULL,
    `status` ENUM('OPEN', 'ACKNOWLEDGED', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `IncidentFollowUp` (
    `id` VARCHAR(191) NOT NULL,
    `incidentId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `action` VARCHAR(191) NOT NULL,
    `remarks` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `IncidentFollowUp_incidentId_createdAt_idx`(`incidentId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MediaAsset` (
    `id` VARCHAR(191) NOT NULL,
    `storageKey` VARCHAR(191) NOT NULL,
    `kind` ENUM('SELFIE', 'CROP_PHOTO', 'INCIDENT_PHOTO', 'ACTIVITY_EVIDENCE') NOT NULL,
    `mimeType` VARCHAR(191) NOT NULL,
    `sizeBytes` INTEGER NOT NULL,
    `farmId` VARCHAR(191) NULL,
    `executionId` VARCHAR(191) NULL,
    `monitoringId` VARCHAR(191) NULL,
    `incidentId` VARCHAR(191) NULL,
    `uploadedById` VARCHAR(191) NOT NULL,
    `verifiedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `MediaAsset_storageKey_key`(`storageKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AuditLog` (
    `id` VARCHAR(191) NOT NULL,
    `actorId` VARCHAR(191) NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `metadata` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `FarmAccess` ADD CONSTRAINT `FarmAccess_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `FarmAccess` ADD CONSTRAINT `FarmAccess_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Plot` ADD CONSTRAINT `Plot_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IrrigationConfiguration` ADD CONSTRAINT `IrrigationConfiguration_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CropCycle` ADD CONSTRAINT `CropCycle_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CropVariety` ADD CONSTRAINT `CropVariety_cropCycleId_fkey` FOREIGN KEY (`cropCycleId`) REFERENCES `CropCycle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Milestone` ADD CONSTRAINT `Milestone_cropCycleId_fkey` FOREIGN KEY (`cropCycleId`) REFERENCES `CropCycle`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgronomyPlan` ADD CONSTRAINT `AgronomyPlan_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgronomyPlan` ADD CONSTRAINT `AgronomyPlan_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_cropCycleId_fkey` FOREIGN KEY (`cropCycleId`) REFERENCES `CropCycle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_milestoneId_fkey` FOREIGN KEY (`milestoneId`) REFERENCES `Milestone`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `AgronomyPlan`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_assignedOfficerId_fkey` FOREIGN KEY (`assignedOfficerId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Task` ADD CONSTRAINT `Task_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskExecution` ADD CONSTRAINT `TaskExecution_taskId_fkey` FOREIGN KEY (`taskId`) REFERENCES `Task`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TaskExecution` ADD CONSTRAINT `TaskExecution_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MaterialUsage` ADD CONSTRAINT `MaterialUsage_executionId_fkey` FOREIGN KEY (`executionId`) REFERENCES `TaskExecution`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LabourUsage` ADD CONSTRAINT `LabourUsage_executionId_fkey` FOREIGN KEY (`executionId`) REFERENCES `TaskExecution`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AttendanceException` ADD CONSTRAINT `AttendanceException_attendanceId_fkey` FOREIGN KEY (`attendanceId`) REFERENCES `Attendance`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `LocationChangeRequest` ADD CONSTRAINT `LocationChangeRequest_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CropMonitoring` ADD CONSTRAINT `CropMonitoring_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CropMonitoring` ADD CONSTRAINT `CropMonitoring_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CropMonitoring` ADD CONSTRAINT `CropMonitoring_cropCycleId_fkey` FOREIGN KEY (`cropCycleId`) REFERENCES `CropCycle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CropMonitoring` ADD CONSTRAINT `CropMonitoring_officerId_fkey` FOREIGN KEY (`officerId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_cropCycleId_fkey` FOREIGN KEY (`cropCycleId`) REFERENCES `CropCycle`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Incident` ADD CONSTRAINT `Incident_reporterId_fkey` FOREIGN KEY (`reporterId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentFollowUp` ADD CONSTRAINT `IncidentFollowUp_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `Incident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `IncidentFollowUp` ADD CONSTRAINT `IncidentFollowUp_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_executionId_fkey` FOREIGN KEY (`executionId`) REFERENCES `TaskExecution`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_monitoringId_fkey` FOREIGN KEY (`monitoringId`) REFERENCES `CropMonitoring`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MediaAsset` ADD CONSTRAINT `MediaAsset_incidentId_fkey` FOREIGN KEY (`incidentId`) REFERENCES `Incident`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_actorId_fkey` FOREIGN KEY (`actorId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- ---- 20260909000000_add_missing_fields_and_tables ----
-- AlterTable User
ALTER TABLE `User`
  ADD COLUMN `phone` VARCHAR(191) NULL,
  ADD COLUMN `dateOfBirth` DATE NULL,
  ADD COLUMN `isSupervisor` BOOLEAN NOT NULL DEFAULT false,
  ADD UNIQUE INDEX `User_phone_key`(`phone`);

-- AlterTable Farm
ALTER TABLE `Farm`
  ADD COLUMN `boundaryGeoJson` TEXT NULL,
  ADD COLUMN `clientPhone` VARCHAR(191) NULL,
  ADD COLUMN `clientDob` DATE NULL;

-- CreateTable
CREATE TABLE `HarvestLog` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `cropCycleId` VARCHAR(191) NOT NULL,
    `harvestDate` DATE NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `grade` VARCHAR(191) NOT NULL,
    `buyerOrMarket` VARCHAR(191) NULL,
    `vehicleNumber` VARCHAR(191) NULL,
    `pricePerUnit` DECIMAL(10, 2) NULL,
    `totalAmount` DECIMAL(12, 2) NULL,
    `notes` VARCHAR(191) NULL,
    `photoKey` VARCHAR(191) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `HarvestLog_farmId_harvestDate_idx`(`farmId`, `harvestDate`),
    INDEX `HarvestLog_cropCycleId_idx`(`cropCycleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryItem` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `quantityInStock` DECIMAL(12, 2) NOT NULL,
    `unit` VARCHAR(191) NOT NULL,
    `reorderLevel` DECIMAL(12, 2) NULL,
    `costPerUnit` DECIMAL(10, 2) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `InventoryItem_farmId_name_key`(`farmId`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryTransaction` (
    `id` VARCHAR(191) NOT NULL,
    `itemId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `quantity` DECIMAL(12, 2) NOT NULL,
    `taskId` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ExpenseLog` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `date` DATE NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `receiptKey` VARCHAR(191) NULL,
    `recordedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ExpenseLog_farmId_date_idx`(`farmId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DailyCrewMuster` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `musterDate` DATE NOT NULL,
    `totalLabourers` INTEGER NOT NULL,
    `maleCount` INTEGER NULL,
    `femaleCount` INTEGER NULL,
    `hoursPerShift` DECIMAL(4, 2) NOT NULL DEFAULT 8.0,
    `dailyWageRate` DECIMAL(10, 2) NULL,
    `totalWageCost` DECIMAL(12, 2) NULL,
    `contractorName` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `recordedById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `DailyCrewMuster_farmId_musterDate_key`(`farmId`, `musterDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AgronomyPrescription` (
    `id` VARCHAR(191) NOT NULL,
    `farmId` VARCHAR(191) NOT NULL,
    `plotId` VARCHAR(191) NOT NULL,
    `cropCycleId` VARCHAR(191) NOT NULL,
    `authorId` VARCHAR(191) NOT NULL,
    `targetIssue` VARCHAR(191) NOT NULL,
    `recipeDetails` JSON NOT NULL,
    `applicationDate` DATE NOT NULL,
    `instructions` VARCHAR(191) NOT NULL,
    `priority` VARCHAR(191) NOT NULL DEFAULT 'HIGH',
    `status` VARCHAR(191) NOT NULL DEFAULT 'DISPATCHED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `AgronomyPrescription_farmId_applicationDate_idx`(`farmId`, `applicationDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `HarvestLog` ADD CONSTRAINT `HarvestLog_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HarvestLog` ADD CONSTRAINT `HarvestLog_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HarvestLog` ADD CONSTRAINT `HarvestLog_cropCycleId_fkey` FOREIGN KEY (`cropCycleId`) REFERENCES `CropCycle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `HarvestLog` ADD CONSTRAINT `HarvestLog_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryItem` ADD CONSTRAINT `InventoryItem_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryTransaction` ADD CONSTRAINT `InventoryTransaction_itemId_fkey` FOREIGN KEY (`itemId`) REFERENCES `InventoryItem`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseLog` ADD CONSTRAINT `ExpenseLog_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ExpenseLog` ADD CONSTRAINT `ExpenseLog_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyCrewMuster` ADD CONSTRAINT `DailyCrewMuster_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DailyCrewMuster` ADD CONSTRAINT `DailyCrewMuster_recordedById_fkey` FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgronomyPrescription` ADD CONSTRAINT `AgronomyPrescription_farmId_fkey` FOREIGN KEY (`farmId`) REFERENCES `Farm`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgronomyPrescription` ADD CONSTRAINT `AgronomyPrescription_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgronomyPrescription` ADD CONSTRAINT `AgronomyPrescription_cropCycleId_fkey` FOREIGN KEY (`cropCycleId`) REFERENCES `CropCycle`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AgronomyPrescription` ADD CONSTRAINT `AgronomyPrescription_authorId_fkey` FOREIGN KEY (`authorId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---- 20260910134533_farm_search_name_index ----
-- CreateIndex (farm name lookup + ORDER BY name at 1L+ rows)
CREATE INDEX `Farm_name_idx` ON `Farm`(`name`);


-- ---- 20260910140845_farm_measured_acres ----
ALTER TABLE `Farm` ADD COLUMN `measuredAcres` DECIMAL(12,2) NULL;


-- ---- 20260910145000_plot_boundary_geo ----
-- AlterTable: first-class plot geospatial boundary (server-validated within farm)
ALTER TABLE `Plot` ADD COLUMN `boundaryGeoJson` TEXT NULL;
ALTER TABLE `Plot` ADD COLUMN `measuredAcres` DECIMAL(12,2) NULL;


-- ---- 20260910153000_attendance_plot_basis ----
-- AlterTable: plot-linked attendance + persisted geofence decision basis
ALTER TABLE `Attendance` ADD COLUMN `plotId` VARCHAR(191) NULL;
ALTER TABLE `Attendance` ADD COLUMN `geofenceBasis` ENUM('PLOT_POLYGON', 'FARM_POLYGON', 'RADIUS') NULL;
CREATE INDEX `Attendance_plotId_idx` ON `Attendance`(`plotId`);
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;


-- ---- 20260910160000_plot_capture_id ----
-- AlterTable: walk-capture idempotency key on Plot (one capture â†’ one plot, ever)
ALTER TABLE `Plot` ADD COLUMN `captureId` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `Plot_captureId_key` ON `Plot`(`captureId`);


-- ---- 20260910170000_boundary_versions ----
-- CreateTable: immutable boundary history + retained GPS evidence
CREATE TABLE `BoundaryVersion` (
  `id` VARCHAR(191) NOT NULL,
  `entityType` ENUM('FARM', 'PLOT') NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL,
  `boundaryGeoJson` TEXT NULL,
  `measuredAcres` DECIMAL(12, 2) NULL,
  `perimeterM` DECIMAL(12, 2) NULL,
  `centroidLat` DECIMAL(10, 7) NULL,
  `centroidLng` DECIMAL(10, 7) NULL,
  `prevAcres` DECIMAL(12, 2) NULL,
  `areaFlagged` BOOLEAN NOT NULL DEFAULT false,
  `source` ENUM('MANUAL_DRAW', 'GPS_WALK', 'GRID_SPLIT', 'LEGACY') NOT NULL,
  `actorId` VARCHAR(191) NULL,
  `actorName` VARCHAR(191) NULL,
  `captureId` VARCHAR(191) NULL,
  `restoredFromVersionId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `BoundaryVersion_entityType_entityId_version_key`(`entityType`, `entityId`, `version`),
  INDEX `BoundaryVersion_entityType_entityId_version_idx`(`entityType`, `entityId`, `version`),
  INDEX `BoundaryVersion_captureId_idx`(`captureId`)
);
CREATE TABLE `WalkTrack` (
  `id` VARCHAR(191) NOT NULL,
  `entityType` ENUM('FARM', 'PLOT') NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `rawSamples` JSON NOT NULL,
  `cleanedSamples` JSON NOT NULL,
  `samplesKept` INTEGER NOT NULL,
  `samplesDropped` INTEGER NOT NULL,
  `quality` VARCHAR(191) NOT NULL,
  `acres` DECIMAL(12, 2) NULL,
  `actorId` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `WalkTrack_entityType_entityId_idx`(`entityType`, `entityId`)
);


-- ---- 20260910180000_task_execution_gps ----
-- AlterTable: completion GPS evidence on TaskExecution
ALTER TABLE `TaskExecution` ADD COLUMN `latitude` DECIMAL(10, 7) NULL;
ALTER TABLE `TaskExecution` ADD COLUMN `longitude` DECIMAL(10, 7) NULL;
ALTER TABLE `TaskExecution` ADD COLUMN `geofenceBasis` ENUM('PLOT_POLYGON', 'FARM_POLYGON', 'RADIUS') NULL;


-- ---- 20260910190000_scouting_gps ----
-- AlterTable: optional scouting GPS evidence
ALTER TABLE `Incident` ADD COLUMN `latitude` DECIMAL(10, 7) NULL;
ALTER TABLE `Incident` ADD COLUMN `longitude` DECIMAL(10, 7) NULL;
ALTER TABLE `Incident` ADD COLUMN `geofenceBasis` ENUM('PLOT_POLYGON', 'FARM_POLYGON', 'RADIUS') NULL;
ALTER TABLE `CropMonitoring` ADD COLUMN `latitude` DECIMAL(10, 7) NULL;
ALTER TABLE `CropMonitoring` ADD COLUMN `longitude` DECIMAL(10, 7) NULL;
ALTER TABLE `CropMonitoring` ADD COLUMN `geofenceBasis` ENUM('PLOT_POLYGON', 'FARM_POLYGON', 'RADIUS') NULL;



