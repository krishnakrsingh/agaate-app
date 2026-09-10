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
