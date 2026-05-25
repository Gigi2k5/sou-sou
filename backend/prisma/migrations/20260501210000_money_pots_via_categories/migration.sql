-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('FREE', 'SAVINGS', 'POT');

-- DropForeignKey
ALTER TABLE "DailyContribution" DROP CONSTRAINT "DailyContribution_goalId_fkey";

-- DropForeignKey
ALTER TABLE "DailyContribution" DROP CONSTRAINT "DailyContribution_userId_fkey";

-- DropForeignKey
ALTER TABLE "MoneyPotPayment" DROP CONSTRAINT "MoneyPotPayment_moneyPotId_fkey";

-- DropForeignKey
ALTER TABLE "MoneyPotPayment" DROP CONSTRAINT "MoneyPotPayment_userId_fkey";

-- AlterTable
ALTER TABLE "ExpenseCategory" ADD COLUMN     "kind" "CategoryKind" NOT NULL DEFAULT 'FREE',
ADD COLUMN     "moneyPotId" TEXT,
ADD COLUMN     "savingsGoalId" TEXT,
ADD COLUMN     "system" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "MoneyPot" DROP COLUMN "currentAmount";

-- AlterTable
ALTER TABLE "SavingsGoal" DROP COLUMN "currentAmount",
ADD COLUMN     "progressNotified" INTEGER[] DEFAULT ARRAY[]::INTEGER[];

-- DropTable
DROP TABLE "DailyContribution";

-- DropTable
DROP TABLE "MoneyPotPayment";

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_savingsGoalId_key" ON "ExpenseCategory"("savingsGoalId");

-- CreateIndex
CREATE INDEX "ExpenseCategory_moneyPotId_idx" ON "ExpenseCategory"("moneyPotId");

-- CreateIndex
CREATE UNIQUE INDEX "ExpenseCategory_userId_moneyPotId_key" ON "ExpenseCategory"("userId", "moneyPotId");

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_moneyPotId_fkey" FOREIGN KEY ("moneyPotId") REFERENCES "MoneyPot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseCategory" ADD CONSTRAINT "ExpenseCategory_savingsGoalId_fkey" FOREIGN KEY ("savingsGoalId") REFERENCES "SavingsGoal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
