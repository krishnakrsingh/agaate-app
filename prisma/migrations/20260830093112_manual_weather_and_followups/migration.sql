-- AlterTable
ALTER TABLE "AgronomyPlan" ADD COLUMN     "manualHumidity" DECIMAL(5,2),
ADD COLUMN     "manualRainForecast" DECIMAL(5,2),
ADD COLUMN     "manualTemperature" DECIMAL(5,2),
ADD COLUMN     "manualWeatherRemarks" TEXT,
ADD COLUMN     "manualWindSpeed" DECIMAL(5,2),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "IncidentFollowUp" (
    "id" TEXT NOT NULL,
    "incidentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncidentFollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncidentFollowUp_incidentId_createdAt_idx" ON "IncidentFollowUp"("incidentId", "createdAt");

-- AddForeignKey
ALTER TABLE "IncidentFollowUp" ADD CONSTRAINT "IncidentFollowUp_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "Incident"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncidentFollowUp" ADD CONSTRAINT "IncidentFollowUp_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
