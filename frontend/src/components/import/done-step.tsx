"use client";

import { motion } from "framer-motion";
import { ArrowRight, PartyPopper, Undo2, Wallet } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { MascotAnimated } from "@/components/mascot/mascot-animated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api";
import { formatMoney } from "@/lib/format";
import { createIncomeSource, createTransaction } from "@/lib/tracker-api";
import type { CommitImportResult } from "@/types/import";

interface DoneStepProps {
  result: CommitImportResult;
  /** Le carnet importé ne contenait aucune entrée d'argent. */
  onlyExpenses: boolean;
  /** Dernier jour couvert par l'import — sert de date au revenu saisi. */
  lastDate: string | null;
  periodLabel: string | null;
  currency: string;
  undoing: boolean;
  onUndo: () => void;
}

export function DoneStep({
  result,
  onlyExpenses,
  lastDate,
  periodLabel,
  currency,
  undoing,
  onUndo,
}: DoneStepProps) {
  const [amount, setAmount] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedIncome, setSavedIncome] = useState(false);

  /**
   * Un carnet de dépenses seules produit un solde massivement négatif : on
   * annoncerait à quelqu'un qu'il est ruiné alors qu'on n'a simplement pas ses
   * revenus. Plutôt que d'afficher ça, on propose de compléter tout de suite.
   */
  async function handleAddIncome() {
    const value = Number(amount.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Entre un montant valide.");
      return;
    }
    setSaving(true);
    try {
      const name = sourceName.trim() || "Revenu";
      const source = await createIncomeSource(name).catch(() => null);
      await createTransaction({
        type: "INCOME",
        amount: value,
        date: new Date(`${lastDate ?? new Date().toISOString().slice(0, 10)}T12:00:00.000Z`),
        note: name,
        ...(source ? { incomeSourceId: source.id } : {}),
      });
      setSavedIncome(true);
      toast.success("Revenu ajouté — ton solde est maintenant juste.");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Ajout impossible"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <section className="rounded-2xl border border-emerald-300 bg-emerald-50 p-5 text-center dark:border-emerald-700/60 dark:bg-emerald-950/25">
        <div className="mb-3 flex justify-center">
          <MascotAnimated mood="happy" size="lg" />
        </div>
        <h2 className="inline-flex items-center gap-2 font-serif text-xl text-sousou-secondary">
          <PartyPopper className="size-5 text-sousou-primary" />
          Ton historique est en place
        </h2>
        <p className="mt-1 text-sm text-sousou-neutral">
          {result.lineCount} transaction{result.lineCount > 1 ? "s" : ""}{" "}
          importée{result.lineCount > 1 ? "s" : ""}
          {periodLabel ? ` · ${periodLabel}` : ""}
        </p>

        <dl className="mx-auto mt-4 grid max-w-sm grid-cols-2 gap-3 text-left">
          <Stat
            label="Sorties"
            value={formatMoney(result.importedExpenseTotal, currency)}
          />
          <Stat
            label="Entrées"
            value={formatMoney(result.importedIncomeTotal, currency)}
          />
        </dl>

        {result.createdCategories + result.createdIncomeSources > 0 && (
          <p className="mt-3 text-xs text-sousou-neutral">
            {result.createdCategories + result.createdIncomeSources} catégorie
            {result.createdCategories + result.createdIncomeSources > 1
              ? "s"
              : ""}{" "}
            créée
            {result.createdCategories + result.createdIncomeSources > 1
              ? "s"
              : ""}{" "}
            au passage.
          </p>
        )}
      </section>

      {onlyExpenses && !savedIncome && (
        <section className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5">
          <h3 className="inline-flex items-center gap-2 font-serif text-lg text-sousou-secondary">
            <Wallet className="size-4 text-sousou-primary" />
            Il manque tes revenus
          </h3>
          <p className="mt-1 text-sm text-sousou-neutral">
            Tes notes ne listaient que des dépenses. Sans tes entrées
            d&apos;argent, ton solde affichera{" "}
            <strong className="text-rose-600 dark:text-rose-400">
              −{formatMoney(result.importedExpenseTotal, currency)}
            </strong>
            , ce qui ne veut rien dire. Ajoute ce que tu as gagné sur la période.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <div>
              <Label htmlFor="income-amount">Montant total reçu</Label>
              <Input
                id="income-amount"
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="150000"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="income-source">Provenance</Label>
              <Input
                id="income-source"
                value={sourceName}
                onChange={(e) => setSourceName(e.target.value)}
                placeholder="Salaire"
                maxLength={60}
                className="mt-1.5"
              />
            </div>
            <Button
              type="button"
              onClick={() => void handleAddIncome()}
              disabled={saving || !amount.trim()}
            >
              {saving ? "Ajout…" : "Ajouter"}
            </Button>
          </div>

          <p className="mt-2 text-xs text-sousou-neutral">
            Tu pourras toujours détailler plus finement depuis la page Suivi.
          </p>
        </section>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          className="flex-1"
          nativeButton={false}
          render={
            <Link href="/dashboard">
              Voir mon tableau de bord
              <ArrowRight className="size-4" />
            </Link>
          }
        />
        <Button
          variant="outline"
          className="flex-1"
          nativeButton={false}
          render={
            <Link href="/transactions?range=all">Voir mes transactions</Link>
          }
        />
      </div>

      {/* L'annulation reste à portée de main : importer deux fois par erreur est
          la mésaventure la plus banale de ce genre d'écran. */}
      <button
        type="button"
        onClick={onUndo}
        disabled={undoing}
        className="mx-auto flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-sousou-neutral transition-colors hover:bg-muted hover:text-rose-600 disabled:opacity-50"
      >
        <Undo2 className="size-3.5" />
        {undoing
          ? "Annulation…"
          : `Annuler cet import (${result.lineCount} transactions)`}
      </button>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card/70 p-3">
      <dt className="text-xs text-sousou-neutral">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums text-sousou-secondary">
        {value}
      </dd>
    </div>
  );
}
