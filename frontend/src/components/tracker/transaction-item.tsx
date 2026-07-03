"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  Pencil,
  Repeat,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatDateRelative, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Transaction } from "@/types/tracker";

export function TransactionItem({
  tx,
  currency,
  onEdit,
  onDelete,
  compact = false,
}: {
  tx: Transaction;
  currency: string;
  onEdit?: (tx: Transaction) => void;
  onDelete?: (tx: Transaction) => void;
  compact?: boolean;
}) {
  const isIncome = tx.type === "INCOME";
  const label =
    (isIncome ? tx.incomeSource?.name : tx.expenseCategory?.name) ??
    "(non catégorisé)";

  return (
    <div
      className={cn(
        "group flex items-center gap-3 px-3 py-3 rounded-2xl",
        "hover:bg-muted/60 transition-colors",
        compact && "px-2 py-2.5",
      )}
    >
      <div
        className={cn(
          "size-10 rounded-xl flex items-center justify-center shrink-0",
          isIncome
            ? "bg-sousou-primary-50 text-sousou-primary-700"
            : "bg-sousou-tertiary/10 text-sousou-tertiary",
        )}
      >
        {isIncome ? (
          <ArrowDownLeft className="size-5" />
        ) : (
          <ArrowUpRight className="size-5" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-medium text-sousou-secondary truncate text-sm">
            {label}
          </span>
          {tx.recurringTransactionId && (
            <span
              className="inline-flex items-center justify-center size-4 rounded-full bg-sousou-primary-50 text-sousou-primary-700 dark:bg-sousou-primary/15 dark:text-sousou-primary shrink-0"
              aria-label="Transaction récurrente"
              title="Générée automatiquement par une récurrence"
            >
              <Repeat className="size-2.5" />
            </span>
          )}
        </div>
        <p className="text-xs text-sousou-neutral truncate">
          {formatDateRelative(tx.date)}
          {tx.note ? ` · ${tx.note}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <span
          className={cn(
            "font-semibold tabular-nums text-sm sm:text-base",
            isIncome ? "text-sousou-primary-700" : "text-sousou-tertiary",
          )}
        >
          {isIncome ? "+" : "-"}
          {formatMoney(tx.amount, currency)}
        </span>

        {(onEdit || onDelete) && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity ml-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onEdit(tx)}
                aria-label="Modifier"
              >
                <Pencil className="size-3.5" />
              </Button>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onDelete(tx)}
                aria-label="Supprimer"
                className="hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
