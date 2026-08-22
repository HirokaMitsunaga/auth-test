-- DropIndex
DROP INDEX "Todo_userId_idx";

-- CreateIndex
CREATE INDEX "Todo_userId_id_idx" ON "Todo"("userId", "id");
