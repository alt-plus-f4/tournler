-- AlterEnum
ALTER TYPE "match_status" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "matches" ADD COLUMN     "paused_at" TIMESTAMP(3);
