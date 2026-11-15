-- AlterTable
ALTER TABLE "Cs2Tournament" ADD COLUMN     "predictions_enabled" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "queued_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "server_hosts" ADD COLUMN     "update_requested_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "match_events" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "map_order" INTEGER,
    "round" INTEGER,
    "round_time" INTEGER,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "match_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "predictions" (
    "id" SERIAL NOT NULL,
    "user_id" UUID NOT NULL,
    "match_id" INTEGER NOT NULL,
    "picked_team_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "predictions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "match_events_match_id_id_idx" ON "match_events"("match_id", "id");

-- CreateIndex
CREATE INDEX "predictions_match_id_idx" ON "predictions"("match_id");

-- CreateIndex
CREATE UNIQUE INDEX "predictions_user_id_match_id_key" ON "predictions"("user_id", "match_id");

-- CreateIndex
CREATE INDEX "matches_queued_at_idx" ON "matches"("queued_at");

