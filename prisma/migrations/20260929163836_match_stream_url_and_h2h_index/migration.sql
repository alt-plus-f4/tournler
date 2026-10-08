-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "stream_url" TEXT;

-- CreateIndex
CREATE INDEX "matches_team_a_id_team_b_id_idx" ON "matches"("team_a_id", "team_b_id");
