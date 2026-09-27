-- CreateEnum
CREATE TYPE "RewatchProvider" AS ENUM ('YOUTUBE', 'TWITCH');

-- AlterTable
ALTER TABLE "homepage_settings" ADD COLUMN     "rewatch_provider" "RewatchProvider" NOT NULL DEFAULT 'YOUTUBE';
