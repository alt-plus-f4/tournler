-- CreateEnum
CREATE TYPE "SiteTheme" AS ENUM ('MONO', 'MOCHA', 'GRUVBOX', 'NORD', 'ROSEPINE');

-- AlterEnum
ALTER TYPE "HomepageLayout" ADD VALUE 'MODERN';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatar_badge_id" INTEGER,
ADD COLUMN     "theme" "SiteTheme";

-- AlterTable: per-badge display placements replace is_overlay
ALTER TABLE "badges" ADD COLUMN     "show_in_trophy_row" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_next_to_name" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "show_on_avatar" BOOLEAN NOT NULL DEFAULT false;

-- Carry the old flag over: overlay badges sat on the avatar instead of the trophy row.
UPDATE "badges" SET "show_on_avatar" = "is_overlay", "show_in_trophy_row" = NOT "is_overlay";

-- The Verified badge was always drawn next to names (src/lib/helpers/player-flair.ts).
-- It belongs next to the name only, not in the avatar corner or the trophy row.
UPDATE "badges" SET "show_next_to_name" = true, "show_on_avatar" = false, "show_in_trophy_row" = false WHERE "name" = 'Verified';

-- is_overlay is kept for one release so code still running from before this migration keeps working;
-- drop it in a later migration once this release is live.

-- AlterTable
ALTER TABLE "user_badges" ADD COLUMN     "hidden" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "site_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "default_theme" "SiteTheme" NOT NULL DEFAULT 'MONO',
    "player_badge_choice" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "User_avatar_badge_id_idx" ON "User"("avatar_badge_id");
