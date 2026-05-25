-- AlterEnum
ALTER TYPE "NotifType" ADD VALUE 'ARTICLE_LIKED';
ALTER TYPE "NotifType" ADD VALUE 'ARTICLE_COMMENTED';

-- AlterTable
ALTER TABLE "Article" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Article" ADD COLUMN "commentCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ArticleLike" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArticleLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleComment" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "hiddenAt" TIMESTAMP(3),
    "hiddenBy" TEXT,
    "hiddenReason" TEXT,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArticleLike_articleId_userId_key" ON "ArticleLike"("articleId", "userId");

-- CreateIndex
CREATE INDEX "ArticleLike_userId_idx" ON "ArticleLike"("userId");

-- CreateIndex
CREATE INDEX "ArticleLike_articleId_idx" ON "ArticleLike"("articleId");

-- CreateIndex
CREATE INDEX "ArticleComment_articleId_createdAt_idx" ON "ArticleComment"("articleId", "createdAt");

-- CreateIndex
CREATE INDEX "ArticleComment_authorId_idx" ON "ArticleComment"("authorId");

-- CreateIndex
CREATE INDEX "ArticleComment_isHidden_idx" ON "ArticleComment"("isHidden");

-- CreateIndex
CREATE INDEX "ArticleComment_reportCount_idx" ON "ArticleComment"("reportCount");

-- AddForeignKey
ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleLike" ADD CONSTRAINT "ArticleLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "Article"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleComment" ADD CONSTRAINT "ArticleComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
