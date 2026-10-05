-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('fixed', 'per_km');

-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "paymentType" "PaymentType" NOT NULL DEFAULT 'fixed',
ADD COLUMN     "pricePerKm" DECIMAL(8,3);

