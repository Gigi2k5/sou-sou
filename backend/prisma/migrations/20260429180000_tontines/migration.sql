-- Tontines : groupes d'épargne entre amis avec leaderboard.

-- CreateTable
CREATE TABLE "TontineGroup" (
    "id"          TEXT      NOT NULL,
    "name"        TEXT      NOT NULL,
    "description" TEXT,
    "inviteCode"  TEXT      NOT NULL,
    "ownerId"     TEXT      NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TontineGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TontineMember" (
    "id"      TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId"  TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TontineMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TontineGroup_inviteCode_key" ON "TontineGroup" ("inviteCode");
CREATE INDEX "TontineGroup_ownerId_idx" ON "TontineGroup" ("ownerId");

CREATE UNIQUE INDEX "TontineMember_groupId_userId_key" ON "TontineMember" ("groupId", "userId");
CREATE INDEX "TontineMember_userId_idx" ON "TontineMember" ("userId");

-- AddForeignKey
ALTER TABLE "TontineGroup" ADD CONSTRAINT "TontineGroup_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TontineMember" ADD CONSTRAINT "TontineMember_groupId_fkey"
    FOREIGN KEY ("groupId") REFERENCES "TontineGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TontineMember" ADD CONSTRAINT "TontineMember_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
