-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "unitId" TEXT;

-- CreateTable
CREATE TABLE "Unit" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "floor" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "tower" TEXT NOT NULL DEFAULT 'Torre Única',
    "status" TEXT NOT NULL DEFAULT 'sem_vistoria',
    "notes" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Unit_number_key" ON "Unit"("number");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
