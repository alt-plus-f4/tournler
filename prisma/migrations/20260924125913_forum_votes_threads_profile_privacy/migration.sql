-- AlterTable
ALTER TABLE "User" ADD COLUMN     "show_discord" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_steam" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "forum_replies" ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "parent_id" INTEGER,
ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "forum_threads" ADD COLUMN     "score" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "forum_votes" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "thread_id" INTEGER,
    "reply_id" INTEGER,
    "value" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "forum_votes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "forum_votes_thread_id_idx" ON "forum_votes"("thread_id");

-- CreateIndex
CREATE INDEX "forum_votes_reply_id_idx" ON "forum_votes"("reply_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_votes_user_id_thread_id_key" ON "forum_votes"("user_id", "thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "forum_votes_user_id_reply_id_key" ON "forum_votes"("user_id", "reply_id");

-- CreateIndex
CREATE INDEX "forum_replies_parent_id_idx" ON "forum_replies"("parent_id");
