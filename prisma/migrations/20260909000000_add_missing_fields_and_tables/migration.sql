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
