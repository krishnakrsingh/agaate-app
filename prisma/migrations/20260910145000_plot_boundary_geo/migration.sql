-- AlterTable: first-class plot geospatial boundary (server-validated within farm)
ALTER TABLE `Plot` ADD COLUMN `boundaryGeoJson` TEXT NULL;
ALTER TABLE `Plot` ADD COLUMN `measuredAcres` DECIMAL(12,2) NULL;
