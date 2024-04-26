/*
  Warnings:

  - You are about to drop the column `password` on the `User` table. All the data in the column will be lost.
  - Added the required column `authenticationkey` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `enc_privatekey` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `publicKey` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "password",
ADD COLUMN     "authenticationkey" TEXT NOT NULL,
ADD COLUMN     "enc_privatekey" TEXT NOT NULL,
ADD COLUMN     "publicKey" TEXT NOT NULL;
