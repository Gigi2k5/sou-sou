-- AlterTable
ALTER TABLE "Article" ADD COLUMN     "hiddenAt" TIMESTAMP(3),
ADD COLUMN     "hiddenBy" TEXT,
ADD COLUMN     "hiddenReason" TEXT,
ADD COLUMN     "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reportCount" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Article_isHidden_idx" ON "Article"("isHidden");

-- CreateIndex
CREATE INDEX "Article_reportCount_idx" ON "Article"("reportCount");

