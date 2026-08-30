-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "faceDistance" DECIMAL(6,3),
ADD COLUMN     "faceModelId" TEXT,
ADD COLUMN     "faceSimilarityPercent" INTEGER,
ADD COLUMN     "faceThresholdVersion" TEXT,
ADD COLUMN     "faceVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "livenessChallengeId" TEXT,
ADD COLUMN     "livenessVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "webauthnCredentialId" TEXT,
ADD COLUMN     "webauthnVerified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "LivenessChallenge" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "instruction" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivenessChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LivenessChallenge_challenge_key" ON "LivenessChallenge"("challenge");

-- CreateIndex
CREATE INDEX "LivenessChallenge_userId_used_idx" ON "LivenessChallenge"("userId", "used");

-- CreateIndex
CREATE INDEX "LivenessChallenge_expiresAt_idx" ON "LivenessChallenge"("expiresAt");

-- AddForeignKey
ALTER TABLE "LivenessChallenge" ADD CONSTRAINT "LivenessChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
