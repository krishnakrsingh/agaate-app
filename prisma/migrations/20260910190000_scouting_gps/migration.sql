-- AlterTable: optional scouting GPS evidence
ALTER TABLE `Incident` ADD COLUMN `latitude` DECIMAL(10, 7) NULL;
ALTER TABLE `Incident` ADD COLUMN `longitude` DECIMAL(10, 7) NULL;
ALTER TABLE `Incident` ADD COLUMN `geofenceBasis` ENUM('PLOT_POLYGON', 'FARM_POLYGON', 'RADIUS') NULL;
ALTER TABLE `CropMonitoring` ADD COLUMN `latitude` DECIMAL(10, 7) NULL;
ALTER TABLE `CropMonitoring` ADD COLUMN `longitude` DECIMAL(10, 7) NULL;
ALTER TABLE `CropMonitoring` ADD COLUMN `geofenceBasis` ENUM('PLOT_POLYGON', 'FARM_POLYGON', 'RADIUS') NULL;
