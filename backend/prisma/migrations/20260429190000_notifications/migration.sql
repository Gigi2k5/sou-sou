-- Notifications in-app : centre de notifications + cron pour les rappels.

-- CreateEnum
CREATE TYPE "NotifType" AS ENUM (
    'CONTRIBUTION_REMINDER',
    'STREAK_AT_RISK',
    'BADGE_UNLOCKED',
    'GOAL_COMPLETED',
    'TONTINE_MEMBER_JOINED',
    'TONTINE_INVITE'
);

-- CreateTable
CREATE TABLE "Notification" (
    "id"        TEXT         NOT NULL,
    "userId"    TEXT         NOT NULL,
    "type"      "NotifType"  NOT NULL,
    "title"     TEXT         NOT NULL,
    "body"      TEXT         NOT NULL,
    "data"      JSONB,
    "isRead"    BOOLEAN      NOT NULL DEFAULT false,
    "readAt"    TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification" ("userId", "createdAt");
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification" ("userId", "isRead");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
