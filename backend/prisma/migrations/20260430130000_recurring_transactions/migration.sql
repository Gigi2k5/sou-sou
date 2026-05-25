-- V2 — Transactions récurrentes (MONTHLY uniquement, day-of-month).
-- Matérialisation par cron quotidien à 1h ; les Transaction générées sont
-- éditables comme une transaction normale (le `recurringTransactionId`
-- sert uniquement de traçabilité + idempotence).

CREATE TABLE "RecurringTransaction" (
    "id"                TEXT             NOT NULL,
    "userId"            TEXT             NOT NULL,
    "type"              "TxType"         NOT NULL,
    "amount"            DOUBLE PRECISION NOT NULL,
    /* 1..31 — clampé au dernier jour du mois si > daysInMonth (ex: 31 → 28/29/30). */
    "dayOfMonth"        INTEGER          NOT NULL,
    "note"              TEXT,
    "incomeSourceId"    TEXT,
    "expenseCategoryId" TEXT,
    "isActive"          BOOLEAN          NOT NULL DEFAULT true,
    "createdAt"         TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "RecurringTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RecurringTransaction_userId_idx" ON "RecurringTransaction" ("userId");
CREATE INDEX "RecurringTransaction_dayOfMonth_isActive_idx"
    ON "RecurringTransaction" ("dayOfMonth", "isActive");

ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_incomeSourceId_fkey"
    FOREIGN KEY ("incomeSourceId") REFERENCES "IncomeSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringTransaction" ADD CONSTRAINT "RecurringTransaction_expenseCategoryId_fkey"
    FOREIGN KEY ("expenseCategoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Lien sur Transaction (nullable : la grande majorité reste manuelle).
ALTER TABLE "Transaction" ADD COLUMN "recurringTransactionId" TEXT;

CREATE INDEX "Transaction_recurringTransactionId_idx"
    ON "Transaction" ("recurringTransactionId");

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringTransactionId_fkey"
    FOREIGN KEY ("recurringTransactionId") REFERENCES "RecurringTransaction"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
