-- CreateEnum
CREATE TYPE "forum_category" AS ENUM ('GENERAL', 'COUNTER_STRIKE', 'TOURNAMENTS', 'OFF_TOPIC');

-- AlterTable
ALTER TABLE "badges" ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "homepage_settings" ADD COLUMN     "show_forum_posts" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "news_posts" ADD COLUMN     "content" JSONB;

-- CreateTable
CREATE TABLE "news_comments" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "author_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "news_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_threads" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "category" "forum_category" NOT NULL DEFAULT 'GENERAL',
    "author_id" TEXT NOT NULL,
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "forum_replies" (
    "id" SERIAL NOT NULL,
    "thread_id" INTEGER NOT NULL,
    "author_id" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "forum_replies_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_comments_post_id_idx" ON "news_comments"("post_id");

-- CreateIndex
CREATE INDEX "news_comments_author_id_idx" ON "news_comments"("author_id");

-- CreateIndex
CREATE INDEX "forum_threads_last_activity_at_idx" ON "forum_threads"("last_activity_at");

-- CreateIndex
CREATE INDEX "forum_threads_category_last_activity_at_idx" ON "forum_threads"("category", "last_activity_at");

-- CreateIndex
CREATE INDEX "forum_threads_author_id_idx" ON "forum_threads"("author_id");

-- CreateIndex
CREATE INDEX "forum_replies_thread_id_created_at_idx" ON "forum_replies"("thread_id", "created_at");

-- CreateIndex
CREATE INDEX "forum_replies_author_id_idx" ON "forum_replies"("author_id");
