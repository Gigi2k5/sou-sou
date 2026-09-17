"use client";

import { Upload } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { DoneStep } from "@/components/import/done-step";
import { PasteStep } from "@/components/import/paste-step";
import { ReviewStep } from "@/components/import/review-step";
import { extractApiErrorMessage } from "@/lib/api";
import {
  analyzeImport,
  commitImport,
  describeAnalyzeError,
  undoImport,
} from "@/lib/import-api";
import { declaredPeriod } from "@/lib/import-checks";
import { useAuth } from "@/providers/auth-provider";
import type {
  CommitImportResult,
  EditableLine,
  ImportAnalysis,
} from "@/types/import";

type Step = "paste" | "review" | "done";

export default function ImportPage() {
  const { user } = useAuth();
  const currency = user?.currency ?? "FCFA";

  const [step, setStep] = useState<Step>("paste");
  const [analysis, setAnalysis] = useState<ImportAnalysis | null>(null);
  const [lines, setLines] = useState<EditableLine[]>([]);
  const [result, setResult] = useState<CommitImportResult | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [undoing, setUndoing] = useState(false);

  const handleAnalyze = useCallback(async (text: string) => {
    setAnalyzing(true);
    try {
      const res = await analyzeImport(text);
      if (res.lines.length === 0) {
        toast.error(
          "Je n'ai trouvé aucune transaction dans ce texte. Vérifie qu'il contient bien des montants.",
        );
        return;
      }
      setAnalysis(res);
      // `uid` est purement local : il survit aux tris et aux suppressions, là
      // où un index de tableau se décalerait à la première ligne retirée.
      setLines(
        res.lines.map((l, i) => ({ ...l, uid: `${i}-${l.date}-${l.label}` })),
      );
      setStep("review");

      const phrases = res.warnings.filter((w) => w !== "ONLY_EXPENSES");
      for (const w of phrases) toast.warning(w, { duration: 7000 });
    } catch (err) {
      toast.error(describeAnalyzeError(err), { duration: 8000 });
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const handleChange = useCallback(
    (uid: string, patch: Partial<EditableLine>) => {
      setLines((prev) =>
        prev.map((l) => (l.uid === uid ? { ...l, ...patch } : l)),
      );
    },
    [],
  );

  const handleDelete = useCallback((uid: string) => {
    setLines((prev) => prev.filter((l) => l.uid !== uid));
  }, []);

  /** Réaffecte toutes les lignes d'une catégorie d'un coup. */
  const handleRemap = useCallback(
    (from: string, direction: "income" | "expense", to: string | undefined) => {
      setLines((prev) =>
        prev.map((l) => {
          if (l.direction !== direction) return l;
          const current = l.category?.trim() || "(sans catégorie)";
          return current === from ? { ...l, category: to } : l;
        }),
      );
    },
    [],
  );

  const handleCommit = useCallback(async () => {
    if (!analysis) return;
    setCommitting(true);
    try {
      const period = declaredPeriod(analysis.checkpoints);
      const res = await commitImport({
        lines: lines.map(({ uid: _uid, confidence: _c, ...rest }) => rest),
        ...(analysis.periodLabel ? { periodLabel: analysis.periodLabel } : {}),
        ...(period.income !== null ? { declaredIncomeTotal: period.income } : {}),
        ...(period.expense !== null
          ? { declaredExpenseTotal: period.expense }
          : {}),
      });
      setResult(res);
      setStep("done");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Import impossible"));
    } finally {
      setCommitting(false);
    }
  }, [analysis, lines]);

  const handleUndo = useCallback(async () => {
    if (!result) return;
    setUndoing(true);
    try {
      const { deletedCount } = await undoImport(result.batchId);
      toast.success(`Import annulé — ${deletedCount} transactions supprimées.`);
      setResult(null);
      setAnalysis(null);
      setLines([]);
      setStep("paste");
    } catch (err) {
      toast.error(extractApiErrorMessage(err, "Annulation impossible"));
    } finally {
      setUndoing(false);
    }
  }, [result]);

  /**
   * « Ce carnet ne contient que des dépenses » se lit sur le résultat ÉCRIT,
   * pas sur le diagnostic d'analyse.
   *
   * Le serveur pose ce constat au moment de l'analyse, avant toute correction.
   * Or c'est précisément une ligne litigieuse que l'utilisateur vient corriger :
   * sur un carnet réel, un versement de salaire avait été lu comme une entrée,
   * puis rebasculé en sortie dans l'écran de revue. L'import final ne contenait
   * plus aucune entrée — mais le diagnostic, figé à l'analyse, disait le
   * contraire, et l'écran proposant de saisir ses revenus ne s'affichait pas.
   *
   * `importedIncomeTotal` vient du commit : c'est ce qui est réellement en base.
   */
  const onlyExpenses =
    result !== null && result.lineCount > 0 && result.importedIncomeTotal === 0;
  const lastDate =
    lines.length > 0
      ? lines.reduce((max, l) => (l.date > max ? l.date : max), lines[0].date)
      : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="inline-flex items-center gap-2 font-serif text-2xl text-sousou-secondary sm:text-3xl">
          <Upload className="size-5 text-sousou-primary" />
          Importer mon historique
        </h1>
        <p className="mt-1 text-sm text-sousou-neutral">
          Tu tenais déjà tes comptes ailleurs ? Récupère-les ici au lieu de tout
          ressaisir.
        </p>
      </header>

      {step === "paste" && (
        <PasteStep loading={analyzing} onAnalyze={(t) => void handleAnalyze(t)} />
      )}

      {step === "review" && analysis && (
        <ReviewStep
          analysis={analysis}
          lines={lines}
          currency={currency}
          committing={committing}
          onChange={handleChange}
          onDelete={handleDelete}
          onRemap={handleRemap}
          onBack={() => setStep("paste")}
          onCommit={() => void handleCommit()}
        />
      )}

      {step === "done" && result && (
        <DoneStep
          result={result}
          onlyExpenses={onlyExpenses}
          lastDate={lastDate}
          periodLabel={analysis?.periodLabel ?? null}
          currency={currency}
          undoing={undoing}
          onUndo={() => void handleUndo()}
        />
      )}
    </div>
  );
}
