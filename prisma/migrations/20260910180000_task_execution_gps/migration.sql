-- AlterTable: completion GPS evidence on TaskExecution
ALTER TABLE `TaskExecution` ADD COLUMN `latitude` DECIMAL(10, 7) NULL;
ALTER TABLE `TaskExecution` ADD COLUMN `longitude` DECIMAL(10, 7) NULL;
ALTER TABLE `TaskExecution` ADD COLUMN `geofenceBasis` ENUM('PLOT_POLYGON', 'FARM_POLYGON', 'RADIUS') NULL;
