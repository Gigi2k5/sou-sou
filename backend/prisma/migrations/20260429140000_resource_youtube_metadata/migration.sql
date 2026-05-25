-- Add YouTube metadata columns to Resource. Table is empty in dev, so we can add NOT NULL columns directly.
ALTER TABLE "Resource"
  ADD COLUMN "videoId"      TEXT NOT NULL,
  ADD COLUMN "channelName"  TEXT NOT NULL,
  ADD COLUMN "thumbnailUrl" TEXT NOT NULL;

CREATE UNIQUE INDEX "Resource_videoId_key" ON "Resource" ("videoId");
CREATE INDEX "Resource_category_idx" ON "Resource" ("category");
