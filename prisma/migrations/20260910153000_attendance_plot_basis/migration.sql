-- AlterTable: plot-linked attendance + persisted geofence decision basis
ALTER TABLE `Attendance` ADD COLUMN `plotId` VARCHAR(191) NULL;
ALTER TABLE `Attendance` ADD COLUMN `geofenceBasis` ENUM('PLOT_POLYGON', 'FARM_POLYGON', 'RADIUS') NULL;
CREATE INDEX `Attendance_plotId_idx` ON `Attendance`(`plotId`);
ALTER TABLE `Attendance` ADD CONSTRAINT `Attendance_plotId_fkey` FOREIGN KEY (`plotId`) REFERENCES `Plot`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
