-- CreateEnum
CREATE TYPE "game" AS ENUM ('CS2', 'LOL');

-- DropIndex
DROP INDEX "User_cs2_team_id_idx";

-- DropIndex
DROP INDEX "cs2_teams_capitan_id_key";

-- DropIndex
DROP INDEX "cs2_teams_name_key";

-- AlterTable
ALTER TABLE "Cs2Tournament" ADD COLUMN     "game" "game" NOT NULL DEFAULT 'CS2';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "games" "game"[] DEFAULT ARRAY[]::"game"[];

-- AlterTable
ALTER TABLE "cs2_teams" ADD COLUMN     "game" "game" NOT NULL DEFAULT 'CS2';

-- CreateTable
CREATE TABLE "riot_accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "puuid" TEXT NOT NULL,
    "game_name" TEXT NOT NULL,
    "tag_line" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "verification_icon_id" INTEGER,
    "verification_expires_at" TIMESTAMP(3),
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "riot_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TeamMembers" (
    "A" INTEGER NOT NULL,
    "B" UUID NOT NULL,

    CONSTRAINT "_TeamMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- Backfill: every existing single-team membership becomes a TeamMembers row (all existing teams are CS2).
INSERT INTO "_TeamMembers" ("A", "B")
SELECT "cs2_team_id", "id"::uuid FROM "User" WHERE "cs2_team_id" IS NOT NULL
ON CONFLICT DO NOTHING;

-- Only now drop the old column.
ALTER TABLE "User" DROP COLUMN "cs2_team_id";

-- CreateIndex
CREATE UNIQUE INDEX "riot_accounts_user_id_key" ON "riot_accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "riot_accounts_puuid_key" ON "riot_accounts"("puuid");

-- CreateIndex
CREATE INDEX "_TeamMembers_B_index" ON "_TeamMembers"("B");

-- CreateIndex
CREATE INDEX "cs2_teams_game_idx" ON "cs2_teams"("game");

-- CreateIndex
CREATE UNIQUE INDEX "cs2_teams_name_game_key" ON "cs2_teams"("name", "game");

-- CreateIndex
CREATE UNIQUE INDEX "cs2_teams_capitan_id_game_key" ON "cs2_teams"("capitan_id", "game");

