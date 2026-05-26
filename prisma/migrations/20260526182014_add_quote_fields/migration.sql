-- AlterTable
ALTER TABLE "FiiPosition" ADD COLUMN     "dividendYield" DECIMAL(8,4),
ADD COLUMN     "lastQuoteAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StockPosition" ADD COLUMN     "dividendYield" DECIMAL(8,4),
ADD COLUMN     "lastQuoteAt" TIMESTAMP(3);
