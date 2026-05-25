-- Add nullable avatarUrl on User. Stores opaque string like "preset:pig-green" or "upload:{userId}.jpg".
ALTER TABLE "User" ADD COLUMN "avatarUrl" TEXT;
