-- AlterEnum
ALTER TYPE "bracket_slot" ADD VALUE 'THIRD_PLACE';

-- CreateEnum
CREATE TYPE "map_action_type" AS ENUM ('BAN', 'PICK', 'DECIDER');

-- AlterTable
ALTER TABLE "Cs2Tournament" ADD COLUMN     "best_of" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "map_pool" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "best_of" INTEGER;

-- CreateTable
CREATE TABLE "match_map_actions" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "team_id" INTEGER,
    "action" "map_action_type" NOT NULL,
    "map_name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_map_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_maps" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "map_name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "score_team_a" INTEGER,
    "score_team_b" INTEGER,
    "winner_id" INTEGER,
    "status" "match_status" NOT NULL DEFAULT 'SCHEDULED',
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_maps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_map_actions_match_id_idx" ON "match_map_actions"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_map_actions_match_id_order_key" ON "match_map_actions"("match_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "match_map_actions_match_id_map_name_key" ON "match_map_actions"("match_id", "map_name");

-- CreateIndex
CREATE INDEX "match_maps_match_id_idx" ON "match_maps"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_maps_match_id_order_key" ON "match_maps"("match_id", "order");

-- CreateIndex
CREATE UNIQUE INDEX "match_maps_match_id_map_name_key" ON "match_maps"("match_id", "map_name");
