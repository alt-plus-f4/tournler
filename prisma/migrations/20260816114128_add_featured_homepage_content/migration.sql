-- CreateEnum
CREATE TYPE "FeaturedSource" AS ENUM ('TOURNAMENTS', 'NEWS', 'MIXED');

-- CreateEnum
CREATE TYPE "FeaturedLayout" AS ENUM ('GRID', 'CAROUSEL');

-- AlterTable
ALTER TABLE "Cs2Tournament" ADD COLUMN     "featured_order" INTEGER,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "news_posts" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "blurb" TEXT NOT NULL,
    "image_url" TEXT,
    "link" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "featured_order" INTEGER,
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "author_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "news_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "featured_source" "FeaturedSource" NOT NULL DEFAULT 'TOURNAMENTS',
    "featured_layout" "FeaturedLayout" NOT NULL DEFAULT 'GRID',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "news_posts_author_id_idx" ON "news_posts"("author_id");
