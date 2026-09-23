-- CreateEnum
CREATE TYPE "pickup_mode" AS ENUM ('OPEN', 'CAPTAIN_DRAFT');

-- AlterEnum
ALTER TYPE "match_slot" ADD VALUE 'POOL';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "pickup_mode" "pickup_mode";

-- CreateTable
CREATE TABLE "match_draft_picks" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "captain_side" "match_slot" NOT NULL,
    "picked_user_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_draft_picks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_draft_picks_match_id_idx" ON "match_draft_picks"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_draft_picks_match_id_order_key" ON "match_draft_picks"("match_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "match_draft_picks_match_id_picked_user_id_key" ON "match_draft_picks"("match_id", "picked_user_id");
