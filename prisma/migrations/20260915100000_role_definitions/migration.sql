-- RoleDefinition catalog (system + custom HQ roles)
CREATE TABLE `RoleDefinition` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NOT NULL DEFAULT '',
    `tier` VARCHAR(191) NOT NULL,
    `scope` VARCHAR(191) NOT NULL,
    `permissions` JSON NOT NULL,
    `isSystem` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RoleDefinition_slug_key`(`slug`),
    INDEX `RoleDefinition_tier_active_idx`(`tier`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `User` ADD COLUMN `roleDefinitionId` VARCHAR(191) NULL;
CREATE INDEX `User_roleDefinitionId_idx` ON `User`(`roleDefinitionId`);
ALTER TABLE `User` ADD CONSTRAINT `User_roleDefinitionId_fkey` FOREIGN KEY (`roleDefinitionId`) REFERENCES `RoleDefinition`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
