-- V2.5 — Cotisations (MoneyPot) : pots solo ou groupe, paiements libres,
-- code d'invitation pour les groupes, leaderboard implicite via somme par
-- membre.

-- ---- 1. NotifType : ajout des 4 nouvelles valeurs ---------------------------
-- (PostgreSQL supporte ALTER TYPE ... ADD VALUE depuis 9.1, donc pas besoin
-- de recréer l'enum cette fois — pas de drop nécessaire.)
ALTER TYPE "NotifType" ADD VALUE IF NOT EXISTS 'CONTRIBUTION_GOAL_PROGRESS';
ALTER TYPE "NotifType" ADD VALUE IF NOT EXISTS 'CONTRIBUTION_GOAL_COMPLETED';
ALTER TYPE "NotifType" ADD VALUE IF NOT EXISTS 'CONTRIBUTION_NEW_MEMBER';
ALTER TYPE "NotifType" ADD VALUE IF NOT EXISTS 'CONTRIBUTION_PAYMENT_RECEIVED';

-- ---- 2. MoneyPot ------------------------------------------------------------
CREATE TABLE "MoneyPot" (
    "id"            TEXT         NOT NULL,
    "name"          TEXT         NOT NULL,
    "description"   TEXT,
    "targetAmount"  DOUBLE PRECISION NOT NULL,
    "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deadline"      TIMESTAMP(3),
    "isCompleted"   BOOLEAN      NOT NULL DEFAULT false,
    "completedAt"   TIMESTAMP(3),
    "isGroup"       BOOLEAN      NOT NULL DEFAULT false,
    -- Code à 6 caractères alphanumériques (sans I/O/0/1) — null si solo.
    "inviteCode"    TEXT,
    -- Paliers de progression déjà notifiés (50, 80) — anti-spam.
    "progressNotified" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "ownerId"       TEXT         NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoneyPot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MoneyPot_inviteCode_key" ON "MoneyPot" ("inviteCode");
CREATE INDEX "MoneyPot_ownerId_idx" ON "MoneyPot" ("ownerId");

ALTER TABLE "MoneyPot" ADD CONSTRAINT "MoneyPot_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- 3. MoneyPotMember ------------------------------------------------------
CREATE TABLE "MoneyPotMember" (
    "id"          TEXT         NOT NULL,
    "moneyPotId"  TEXT         NOT NULL,
    "userId"      TEXT         NOT NULL,
    "joinedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyPotMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MoneyPotMember_moneyPotId_userId_key"
    ON "MoneyPotMember" ("moneyPotId", "userId");
CREATE INDEX "MoneyPotMember_userId_idx" ON "MoneyPotMember" ("userId");

ALTER TABLE "MoneyPotMember" ADD CONSTRAINT "MoneyPotMember_moneyPotId_fkey"
    FOREIGN KEY ("moneyPotId") REFERENCES "MoneyPot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MoneyPotMember" ADD CONSTRAINT "MoneyPotMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ---- 4. MoneyPotPayment -----------------------------------------------------
CREATE TABLE "MoneyPotPayment" (
    "id"          TEXT             NOT NULL,
    "moneyPotId"  TEXT             NOT NULL,
    "userId"      TEXT             NOT NULL,
    "amount"      DOUBLE PRECISION NOT NULL,
    "note"        TEXT,
    "paidAt"      TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MoneyPotPayment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MoneyPotPayment_moneyPotId_paidAt_idx"
    ON "MoneyPotPayment" ("moneyPotId", "paidAt");
CREATE INDEX "MoneyPotPayment_userId_idx" ON "MoneyPotPayment" ("userId");

ALTER TABLE "MoneyPotPayment" ADD CONSTRAINT "MoneyPotPayment_moneyPotId_fkey"
    FOREIGN KEY ("moneyPotId") REFERENCES "MoneyPot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MoneyPotPayment" ADD CONSTRAINT "MoneyPotPayment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
