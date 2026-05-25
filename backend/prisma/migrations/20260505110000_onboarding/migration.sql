-- AlterTable
ALTER TABLE "User" ADD COLUMN "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "onboardingStep" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);

-- Backfill : les users existants ne doivent pas voir le flow d'onboarding.
-- On les marque "complété" avec leur date de création comme timestamp d'équivalence.
UPDATE "User"
   SET "hasCompletedOnboarding" = true,
       "onboardingCompletedAt" = "createdAt";
