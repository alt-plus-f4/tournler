-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('USER', 'MODERATOR', 'TOURNAMENT_ADMIN', 'CONTENT_ADMIN', 'ADMIN');

-- CreateEnum
CREATE TYPE "tournament_status" AS ENUM ('UPCOMING', 'ONGOING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "tournament_type" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "game_server_status" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "Account" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "type" VARCHAR NOT NULL,
    "provider" VARCHAR NOT NULL,
    "provider_account_id" VARCHAR NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" VARCHAR,
    "scope" VARCHAR,
    "id_token" TEXT,
    "session_state" VARCHAR,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" UUID NOT NULL,
    "session_token" VARCHAR NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR NOT NULL,
    "name" VARCHAR,
    "image" VARCHAR,
    "bio" VARCHAR DEFAULT 'Software developer by day, gamer by night 67',
    "is_onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "email_verified" TIMESTAMP(6),
    "role" "user_role" NOT NULL DEFAULT 'USER',
    "cs2_team_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cs2Tournament" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "banner_url" TEXT,
    "logo_url" TEXT,
    "prize_pool" INTEGER,
    "team_capacity" INTEGER NOT NULL,
    "location" TEXT NOT NULL,
    "type" "tournament_type" NOT NULL,
    "status" "tournament_status" NOT NULL,
    "organizer_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cs2Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cs2_teams" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "logo" TEXT,
    "background" TEXT,
    "capitan_id" TEXT,
    "cs2_tournament_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cs2_teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cs2_team_invitations" (
    "id" SERIAL NOT NULL,
    "team_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cs2_team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SteamAccount" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "steam_id" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SteamAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscordAccount" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "discord_id" VARCHAR NOT NULL,
    "access_token" VARCHAR NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DiscordAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" VARCHAR NOT NULL,
    "token" VARCHAR NOT NULL,
    "expires" TIMESTAMP(6) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "matches" (
    "id" SERIAL NOT NULL,
    "tournament_id" INTEGER NOT NULL,
    "team_a_id" INTEGER NOT NULL,
    "team_b_id" INTEGER NOT NULL,
    "winner_id" INTEGER,
    "score_team_a" INTEGER,
    "score_team_b" INTEGER,
    "match_date" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_servers" (
    "id" SERIAL NOT NULL,
    "match_id" INTEGER NOT NULL,
    "connect_ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "password" TEXT NOT NULL,
    "status" "game_server_status" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_servers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_user_id_idx" ON "Account"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_provider_account_id_key" ON "Account"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "Session_session_token_key" ON "Session"("session_token");

-- CreateIndex
CREATE INDEX "Session_user_id_idx" ON "Session"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_cs2_team_id_idx" ON "User"("cs2_team_id");

-- CreateIndex
CREATE UNIQUE INDEX "Cs2Tournament_name_key" ON "Cs2Tournament"("name");

-- CreateIndex
CREATE INDEX "Cs2Tournament_organizer_id_idx" ON "Cs2Tournament"("organizer_id");

-- CreateIndex
CREATE UNIQUE INDEX "cs2_teams_name_key" ON "cs2_teams"("name");

-- CreateIndex
CREATE UNIQUE INDEX "cs2_teams_capitan_id_key" ON "cs2_teams"("capitan_id");

-- CreateIndex
CREATE INDEX "cs2_teams_cs2_tournament_id_idx" ON "cs2_teams"("cs2_tournament_id");

-- CreateIndex
CREATE INDEX "cs2_team_invitations_team_id_idx" ON "cs2_team_invitations"("team_id");

-- CreateIndex
CREATE INDEX "cs2_team_invitations_user_id_idx" ON "cs2_team_invitations"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SteamAccount_user_id_key" ON "SteamAccount"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "SteamAccount_steam_id_key" ON "SteamAccount"("steam_id");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordAccount_user_id_key" ON "DiscordAccount"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "DiscordAccount_discord_id_key" ON "DiscordAccount"("discord_id");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "matches_tournament_id_idx" ON "matches"("tournament_id");

-- CreateIndex
CREATE INDEX "matches_team_a_id_idx" ON "matches"("team_a_id");

-- CreateIndex
CREATE INDEX "matches_team_b_id_idx" ON "matches"("team_b_id");

-- CreateIndex
CREATE INDEX "matches_winner_id_idx" ON "matches"("winner_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_servers_match_id_key" ON "game_servers"("match_id");

-- CreateIndex
CREATE INDEX "game_servers_match_id_idx" ON "game_servers"("match_id");

