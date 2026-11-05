-- Flat copy of 20261106000000_display_currency/migration.sql: applies on top of 0001_init.sql.
-- v1.1.1: per-user display currency + summaries cached per display currency.

-- AlterTable
ALTER TABLE "User" ADD COLUMN "displayCurrency" TEXT;

-- AlterTable
ALTER TABLE "DatasetSummary" ADD COLUMN "currency" TEXT NOT NULL DEFAULT '';

-- DropIndex
DROP INDEX "DatasetSummary_datasetId_language_key";

-- CreateIndex
CREATE UNIQUE INDEX "DatasetSummary_datasetId_language_currency_key" ON "DatasetSummary"("datasetId", "language", "currency");
