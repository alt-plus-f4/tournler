-- CreateEnum
CREATE TYPE "HomepageLayout" AS ENUM ('CLASSIC', 'SEASON', 'DOORS', 'CAMPUS', 'WEEK');

-- AlterTable
ALTER TABLE "homepage_settings" ADD COLUMN     "layout" "HomepageLayout" NOT NULL DEFAULT 'CLASSIC';
