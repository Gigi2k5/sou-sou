-- AlterTable
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "verificationCodeHash" TEXT;
ALTER TABLE "User" ADD COLUMN "verificationCodeExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "verificationAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "verificationCodeSentAt" TIMESTAMP(3);

-- Backfill : les comptes existants ont été créés avant la vérification email.
-- On les considère vérifiés, sinon tout le monde se retrouve lock-out au
-- prochain login (y compris les admins).
UPDATE "User" SET "emailVerified" = true;
