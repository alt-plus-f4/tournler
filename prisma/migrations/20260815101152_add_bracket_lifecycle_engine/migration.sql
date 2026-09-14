-- CreateEnum
CREATE TYPE "tournament_format" AS ENUM ('SINGLE_ELIMINATION', 'ROUND_ROBIN', 'DOUBLE_ELIMINATION');

-- CreateEnum
CREATE TYPE "match_status" AS ENUM ('SCHEDULED', 'LIVE', 'COMPLETED');

-- CreateEnum
CREATE TYPE "bracket_slot" AS ENUM ('WINNERS', 'LOSERS', 'GRAND_FINAL');

-- CreateEnum
CREATE TYPE "match_slot" AS ENUM ('TEAM_A', 'TEAM_B');

-- AlterTable
ALTER TABLE "Cs2Tournament" ADD COLUMN     "format" "tournament_format" NOT NULL DEFAULT 'SINGLE_ELIMINATION';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "bracket_slot" "bracket_slot" NOT NULL DEFAULT 'WINNERS',
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "next_loser_match_id" INTEGER,
ADD COLUMN     "next_loser_match_slot" "match_slot",
ADD COLUMN     "next_match_id" INTEGER,
ADD COLUMN     "next_match_slot" "match_slot",
ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "round" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "status" "match_status" NOT NULL DEFAULT 'SCHEDULED',
ALTER COLUMN "team_a_id" DROP NOT NULL,
ALTER COLUMN "team_b_id" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "matches_tournament_id_bracket_slot_round_idx" ON "matches"("tournament_id", "bracket_slot", "round");

-- CreateIndex
CREATE INDEX "matches_next_match_id_idx" ON "matches"("next_match_id");

-- CreateIndex
CREATE INDEX "matches_next_loser_match_id_idx" ON "matches"("next_loser_match_id");

-- Backfill status for pre-existing rows (new rows default to SCHEDULED, which is already
-- correct for anything not touched below). round/bracket_slot defaults (1/WINNERS) are also
-- already correct for every pre-existing row, since nothing before this migration ever created
-- round 2+ or a non-WINNERS match.
UPDATE "matches" SET "status" = 'COMPLETED' WHERE "winner_id" IS NOT NULL;
UPDATE "matches" SET "status" = 'LIVE' WHERE "winner_id" IS NULL AND ("score_team_a" IS NOT NULL OR "score_team_b" IS NOT NULL);
