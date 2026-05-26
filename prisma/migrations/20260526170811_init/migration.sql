-- CreateEnum
CREATE TYPE "CaixinhaMovementType" AS ENUM ('APORTE', 'RESGATE', 'RENDIMENTO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "TradeMovementType" AS ENUM ('COMPRA', 'VENDA', 'DIVIDENDO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Institution" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Institution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Caixinha" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT,
    "name" TEXT NOT NULL,
    "cdiPercent" DECIMAL(5,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Caixinha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CaixinhaMovement" (
    "id" TEXT NOT NULL,
    "caixinhaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "CaixinhaMovementType" NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CaixinhaMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiiPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT,
    "ticker" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "averagePrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "currentPrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FiiPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiiMovement" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TradeMovementType" NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiiMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "institutionId" TEXT,
    "ticker" TEXT NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "averagePrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "currentPrice" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TradeMovementType" NOT NULL,
    "quantity" DECIMAL(14,4) NOT NULL,
    "unitPrice" DECIMAL(14,4) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Institution_userId_idx" ON "Institution"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Institution_userId_name_key" ON "Institution"("userId", "name");

-- CreateIndex
CREATE INDEX "Caixinha_userId_idx" ON "Caixinha"("userId");

-- CreateIndex
CREATE INDEX "CaixinhaMovement_caixinhaId_idx" ON "CaixinhaMovement"("caixinhaId");

-- CreateIndex
CREATE INDEX "CaixinhaMovement_userId_idx" ON "CaixinhaMovement"("userId");

-- CreateIndex
CREATE INDEX "FiiPosition_userId_idx" ON "FiiPosition"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "FiiPosition_userId_ticker_key" ON "FiiPosition"("userId", "ticker");

-- CreateIndex
CREATE INDEX "FiiMovement_positionId_idx" ON "FiiMovement"("positionId");

-- CreateIndex
CREATE INDEX "FiiMovement_userId_idx" ON "FiiMovement"("userId");

-- CreateIndex
CREATE INDEX "StockPosition_userId_idx" ON "StockPosition"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StockPosition_userId_ticker_key" ON "StockPosition"("userId", "ticker");

-- CreateIndex
CREATE INDEX "StockMovement_positionId_idx" ON "StockMovement"("positionId");

-- CreateIndex
CREATE INDEX "StockMovement_userId_idx" ON "StockMovement"("userId");

-- AddForeignKey
ALTER TABLE "Institution" ADD CONSTRAINT "Institution_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caixinha" ADD CONSTRAINT "Caixinha_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Caixinha" ADD CONSTRAINT "Caixinha_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CaixinhaMovement" ADD CONSTRAINT "CaixinhaMovement_caixinhaId_fkey" FOREIGN KEY ("caixinhaId") REFERENCES "Caixinha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiiPosition" ADD CONSTRAINT "FiiPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiiPosition" ADD CONSTRAINT "FiiPosition_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FiiMovement" ADD CONSTRAINT "FiiMovement_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "FiiPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPosition" ADD CONSTRAINT "StockPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPosition" ADD CONSTRAINT "StockPosition_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "Institution"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "StockPosition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
