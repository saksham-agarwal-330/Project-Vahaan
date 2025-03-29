/*
  Warnings:

  - A unique constraint covering the columns `[userId,carId]` on the table `UserSavedCar` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[dealershipId,dayOfWeek]` on the table `WorkingHours` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "UserSavedCar_userId_carId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "UserSavedCar_userId_carId_key" ON "UserSavedCar"("userId", "carId");

-- CreateIndex
CREATE INDEX "WorkingHours_dealershipId_idx" ON "WorkingHours"("dealershipId");

-- CreateIndex
CREATE INDEX "WorkingHours_dayOfWeek_idx" ON "WorkingHours"("dayOfWeek");

-- CreateIndex
CREATE INDEX "WorkingHours_isOpen_idx" ON "WorkingHours"("isOpen");

-- CreateIndex
CREATE UNIQUE INDEX "WorkingHours_dealershipId_dayOfWeek_key" ON "WorkingHours"("dealershipId", "dayOfWeek");
