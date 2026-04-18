/*
  Warnings:

  - The `status` column on the `Order` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `healthStatus` column on the `PlantTracking` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `certificationStatus` column on the `Produce` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `RentalBooking` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `SustainabilityCert` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `certificationStatus` column on the `VendorProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `category` on the `CommunityPost` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `healthStatus` on the `PlantHealthUpdate` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `role` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'VENDOR', 'CUSTOMER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('PENDING', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HealthStatus" AS ENUM ('HEALTHY', 'NEEDS_WATER', 'PEST_ISSUE', 'DISEASED', 'HARVEST_READY');

-- CreateEnum
CREATE TYPE "PostCategory" AS ENUM ('TIPS', 'QUESTION', 'SUCCESS_STORY', 'EVENT');

-- AlterTable
ALTER TABLE "CommunityPost" DROP COLUMN "category",
ADD COLUMN     "category" "PostCategory" NOT NULL;

-- AlterTable
ALTER TABLE "Order" DROP COLUMN "status",
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "PlantHealthUpdate" DROP COLUMN "healthStatus",
ADD COLUMN     "healthStatus" "HealthStatus" NOT NULL;

-- AlterTable
ALTER TABLE "PlantTracking" DROP COLUMN "healthStatus",
ADD COLUMN     "healthStatus" "HealthStatus" NOT NULL DEFAULT 'HEALTHY';

-- AlterTable
ALTER TABLE "Produce" DROP COLUMN "certificationStatus",
ADD COLUMN     "certificationStatus" "CertificationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "RentalBooking" DROP COLUMN "status",
ADD COLUMN     "status" "RentalStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "SustainabilityCert" DROP COLUMN "status",
ADD COLUMN     "status" "CertificationStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "VendorProfile" DROP COLUMN "certificationStatus",
ADD COLUMN     "certificationStatus" "CertificationStatus" NOT NULL DEFAULT 'PENDING';
