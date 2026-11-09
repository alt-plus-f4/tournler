-- CreateIndex
CREATE INDEX "Cs2Tournament_status_start_date_idx" ON "Cs2Tournament"("status", "start_date");

-- CreateIndex
CREATE INDEX "Cs2Tournament_is_featured_featured_order_idx" ON "Cs2Tournament"("is_featured", "featured_order");

-- CreateIndex
CREATE INDEX "matches_status_idx" ON "matches"("status");

-- CreateIndex
CREATE INDEX "news_posts_published_at_idx" ON "news_posts"("published_at");

-- CreateIndex
CREATE INDEX "news_posts_is_featured_featured_order_idx" ON "news_posts"("is_featured", "featured_order");

