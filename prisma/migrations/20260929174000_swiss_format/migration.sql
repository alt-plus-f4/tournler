-- AlterEnum
ALTER TYPE "tournament_format" ADD VALUE 'SWISS';

-- AlterTable
ALTER TABLE "Cs2Tournament" ADD COLUMN     "swiss_rounds" INTEGER;
