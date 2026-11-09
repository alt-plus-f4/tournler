-- CreateEnum
CREATE TYPE "cs2_server_status" AS ENUM ('ACTIVE', 'DRAINING', 'DISABLED');

-- AlterTable
ALTER TABLE "game_servers" ADD COLUMN     "server_id" INTEGER;

-- CreateTable
CREATE TABLE "server_hosts" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'eu',
    "public_host" TEXT NOT NULL,
    "agent_url" TEXT,
    "agent_secret_enc" TEXT,
    "port_range_start" INTEGER NOT NULL DEFAULT 27015,
    "port_step" INTEGER NOT NULL DEFAULT 10,
    "max_servers" INTEGER NOT NULL DEFAULT 4,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "server_hosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cs2_servers" (
    "id" SERIAL NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "host_id" INTEGER,
    "ip" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "rcon_host" TEXT NOT NULL,
    "rcon_port" INTEGER NOT NULL,
    "rcon_password_enc" TEXT NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'eu',
    "status" "cs2_server_status" NOT NULL DEFAULT 'ACTIVE',
    "managed" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMP(3),
    "last_healthy" BOOLEAN,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cs2_servers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "server_hosts_slug_key" ON "server_hosts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "cs2_servers_slug_key" ON "cs2_servers"("slug");

-- CreateIndex
CREATE INDEX "cs2_servers_host_id_idx" ON "cs2_servers"("host_id");

-- CreateIndex
CREATE INDEX "cs2_servers_status_idx" ON "cs2_servers"("status");

-- CreateIndex
CREATE UNIQUE INDEX "cs2_servers_ip_port_key" ON "cs2_servers"("ip", "port");

-- CreateIndex
CREATE INDEX "game_servers_server_id_idx" ON "game_servers"("server_id");

