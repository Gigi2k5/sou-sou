-- V2.5 — Avatars débloqués par achievement.
-- 1) Recrée l'enum NotifType : drop des valeurs TONTINE_* + ajout AVATAR_UNLOCKED.
--    Les notifs orphelines TONTINE_* ont déjà été supprimées à la migration précédente.
-- 2) Nouvelle table AvatarUnlock pour tracer le déblocage d'un avatar par un user.

-- ---- 1. NotifType : drop TONTINE_* + ajout AVATAR_UNLOCKED ------------------
ALTER TYPE "NotifType" RENAME TO "NotifType_old";

CREATE TYPE "NotifType" AS ENUM (
    'CONTRIBUTION_REMINDER',
    'STREAK_AT_RISK',
    'BADGE_UNLOCKED',
    'GOAL_COMPLETED',
    'AVATAR_UNLOCKED'
);

ALTER TABLE "Notification"
    ALTER COLUMN "type" TYPE "NotifType"
    USING "type"::text::"NotifType";

DROP TYPE "NotifType_old";

-- ---- 2. AvatarUnlock --------------------------------------------------------
CREATE TABLE "AvatarUnlock" (
    "id"         TEXT         NOT NULL,
    "userId"     TEXT         NOT NULL,
    "avatarKey"  TEXT         NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvatarUnlock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AvatarUnlock_userId_avatarKey_key"
    ON "AvatarUnlock" ("userId", "avatarKey");
CREATE INDEX "AvatarUnlock_userId_idx" ON "AvatarUnlock" ("userId");

ALTER TABLE "AvatarUnlock" ADD CONSTRAINT "AvatarUnlock_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
