-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "addedById" TEXT,
ADD COLUMN     "isFeatured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "position" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill : position = -timestamp_ms (récentes en tête lors du tri ASC).
UPDATE "Resource" SET "position" = -EXTRACT(EPOCH FROM "createdAt") * 1000;

-- CreateIndex
CREATE INDEX "Resource_position_idx" ON "Resource"("position");

-- CreateIndex
CREATE INDEX "Resource_isFeatured_idx" ON "Resource"("isFeatured");

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

