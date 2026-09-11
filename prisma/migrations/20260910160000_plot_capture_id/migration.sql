-- AlterTable: walk-capture idempotency key on Plot (one capture → one plot, ever)
ALTER TABLE `Plot` ADD COLUMN `captureId` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `Plot_captureId_key` ON `Plot`(`captureId`);
