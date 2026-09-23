-- AlterTable
ALTER TABLE "player_match_stats" ADD COLUMN     "side" "match_slot",
ALTER COLUMN "team_id" DROP NOT NULL;
