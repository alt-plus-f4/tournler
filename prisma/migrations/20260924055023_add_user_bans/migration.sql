-- CreateTable
CREATE TABLE "user_bans" (
    "id" SERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "banned_by_id" TEXT,
    "expires_at" TIMESTAMP(3),
    "lifted_at" TIMESTAMP(3),
    "lifted_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_bans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_bans_user_id_lifted_at_idx" ON "user_bans"("user_id", "lifted_at");

-- CreateIndex
CREATE INDEX "user_bans_created_at_idx" ON "user_bans"("created_at");
