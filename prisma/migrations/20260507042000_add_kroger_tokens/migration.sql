-- AlterTable
ALTER TABLE "User" ADD COLUMN     "krogerAccessToken" TEXT,
ADD COLUMN     "krogerRefreshToken" TEXT,
ADD COLUMN     "krogerTokenExpiry" TIMESTAMP(3);
