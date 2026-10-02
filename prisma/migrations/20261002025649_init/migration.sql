-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('diesel', 'diesel_s10', 'gasolina', 'etanol', 'gnv');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('oil', 'tires', 'brakes', 'belt', 'clutch', 'service', 'other');

-- CreateEnum
CREATE TYPE "MaintenanceStatus" AS ENUM ('done', 'planned');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "localImportAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "model" VARCHAR(80) NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "kmPerLiter" DECIMAL(6,2) NOT NULL,
    "estimatedMonthlyKm" INTEGER NOT NULL DEFAULT 4000,
    "odometerKm" INTEGER,
    "odometerDate" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FixedCost" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "insuranceAnnual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "insuranceExpiresOn" DATE,
    "ipvaAnnual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "licensingAnnual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "financingMonthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "trackerMonthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "phoneMonthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherMonthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FixedCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WearItem" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "label" VARCHAR(60) NOT NULL,
    "cost" DECIMAL(10,2) NOT NULL,
    "lifespanKm" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WearItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "date" DATE NOT NULL,
    "freightRevenue" DECIMAL(12,2) NOT NULL,
    "km" DECIMAL(10,1) NOT NULL,
    "fuelLiters" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "fuelPricePerLiter" DECIMAL(8,3) NOT NULL DEFAULT 0,
    "tolls" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "helperPayment" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "otherCosts" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Maintenance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" VARCHAR(120) NOT NULL DEFAULT '',
    "status" "MaintenanceStatus" NOT NULL,
    "date" DATE NOT NULL,
    "odometerKm" INTEGER,
    "cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Maintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "monthlyProfitTarget" DECIMAL(12,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Vehicle_userId_updatedAt_idx" ON "Vehicle"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "FixedCost_vehicleId_key" ON "FixedCost"("vehicleId");

-- CreateIndex
CREATE INDEX "WearItem_vehicleId_idx" ON "WearItem"("vehicleId");

-- CreateIndex
CREATE INDEX "Trip_userId_date_idx" ON "Trip"("userId", "date");

-- CreateIndex
CREATE INDEX "Trip_userId_updatedAt_idx" ON "Trip"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Maintenance_userId_updatedAt_idx" ON "Maintenance"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Maintenance_vehicleId_date_idx" ON "Maintenance"("vehicleId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Goal_userId_key" ON "Goal"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FixedCost" ADD CONSTRAINT "FixedCost_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WearItem" ADD CONSTRAINT "WearItem_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Maintenance" ADD CONSTRAINT "Maintenance_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
