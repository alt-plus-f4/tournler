-- CreateTable
CREATE TABLE "player_match_stats" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "team_id" INTEGER NOT NULL,
    "kills" INTEGER NOT NULL DEFAULT 0,
    "deaths" INTEGER NOT NULL DEFAULT 0,
    "assists" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "player_match_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "player_match_stats_match_id_idx" ON "player_match_stats"("match_id");

-- CreateIndex
CREATE INDEX "player_match_stats_user_id_idx" ON "player_match_stats"("user_id");

-- CreateIndex
CREATE INDEX "player_match_stats_team_id_idx" ON "player_match_stats"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "player_match_stats_match_id_user_id_key" ON "player_match_stats"("match_id", "user_id");
