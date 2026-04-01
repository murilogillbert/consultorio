-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "bloodType" TEXT,
ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "SystemUser" ADD COLUMN     "permissions" JSONB;
