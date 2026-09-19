import type { ImportAnalysis, ImportCheckpoint, ImportLine } from "@/types/import";

import { findBlocks, normalize, type Sheet } from "./grid";
import { type DeclaredTotal, parseSheet, type SheetParse } from "./parse";

/**
 * Décide, pour une feuille donnée, si la lecture déterministe suffit ou s'il
 * faut passer la main au modèle de langage.
 *
 * Le danger d'un parseur tolérant n'est pas qu'il échoue : c'est qu'il
 * réussisse DE TRAVERS. Il lit quarante-sept lignes sur quarante-huit et ne
 * doute de rien. La bascule ne peut donc pas s'appuyer sur « une erreur a été
 * levée » — dans ce cas précis, aucune erreur n'est levée.
 *
 * L'arbitre, c'est le recoupement des totaux annoncés par le fichier lui-même.
 * Objectif, chiffré, et hors de portée du parseur.
 */
export type SheetVerdict =
  /** Les totaux annoncés tombent juste. Instantané, gratuit, sûr. */
  | "reconciled"
  /** Le fichier n'annonce aucun total : rien à recouper, et on le dira. */
  | "unverified"
  /** Les totaux ne tombent pas, ou rien n'a été compris. Au modèle de jouer. */
  | "fallback";

export interface SheetAnalysis {
  sheetName: string;
  /** La feuille brute — c'est elle qu'on renvoie au modèle si on bascule. */
  sheet: Sheet;
  verdict: SheetVerdict;
  analysis: ImportAnalysis;
  /** Pourquoi on bascule, en une phrase lisible. Vide si on ne bascule pas. */
  reason: string | null;
  parse: SheetParse;
}

export function analyzeSheet(sheet: Sheet): SheetAnalysis {
  const blocks = findBlocks(sheet.grid);
  const parse = parseSheet(blocks);

  const checkpoints = buildCheckpoints(parse.lines, parse.declared, parse.periodLabel);
  const analysis = toAnalysis(sheet, parse, checkpoints);

  const { verdict, reason } = judge(parse, checkpoints);
  return { sheetName: sheet.name, sheet, verdict, analysis, reason, parse };
}

function judge(
  parse: SheetParse,
  checkpoints: ImportCheckpoint[],
): { verdict: SheetVerdict; reason: string | null } {
  if (parse.lines.length === 0) {
    return {
      verdict: "fallback",
      reason: "Je n'ai reconnu aucun tableau de transactions dans cette feuille.",
    };
  }

  const failed = checkpoints.filter((c) => !c.ok);
  if (failed.length > 0) {
    const worst = failed.reduce((a, b) =>
      Math.abs(b.computed - b.declared) > Math.abs(a.computed - a.declared) ? b : a,
    );
    return {
      verdict: "fallback",
      reason: `Ma lecture ne retombe pas sur tes totaux (« ${worst.label} » : ${worst.declared} annoncé, ${worst.computed} lu).`,
    };
  }

  if (checkpoints.length === 0) {
    // Aucun total à recouper. Passer par le modèle ne vérifierait rien de plus
    // et coûterait une minute et du quota — SAUF s'il reste des blocs entiers
    // qu'on n'a pas su lire, signe qu'il y a autre chose dans cette feuille.
    if (parse.unread.length > 0) {
      return {
        verdict: "fallback",
        reason: `${parse.unread.length} partie(s) de cette feuille me sont restées obscures, et aucun total ne permet de vérifier le reste.`,
      };
    }
    return { verdict: "unverified", reason: null };
  }

  return { verdict: "reconciled", reason: null };
}

/**
 * Confronte chaque total annoncé à ce qui a été lu.
 *
 * Sur un tableur, ce contrôle ne cherche PAS les erreurs de calcul de
 * l'utilisateur : ses totaux sont des formules, donc toujours cohérents avec
 * ses lignes. Il vérifie NOTRE lecture. Si on a sauté une ligne, mal lu un
 * « 1 275 » à espace insécable ou raté une cellule fusionnée, c'est ici et
 * nulle part ailleurs que ça se voit.
 */
export function buildCheckpoints(
  lines: ImportLine[],
  declared: DeclaredTotal[],
  periodLabel: string | null,
): ImportCheckpoint[] {
  const out: ImportCheckpoint[] = [];

  for (const d of declared) {
    const computed =
      d.scope === "period"
        ? sumOf(lines, d.measure)
        : sumOf(
            lines.filter((l) => normalize(l.category ?? "") === normalize(d.label)),
            d.measure,
          );

    out.push({
      scope: d.scope,
      label: d.scope === "period" ? (periodLabel ?? d.label) : d.label,
      direction: d.measure,
      declared: d.value,
      computed,
      ok: Math.abs(computed - d.value) < 0.5,
    });
  }

  // Les contrôles de période d'abord : c'est le verdict d'ensemble, et il doit
  // apparaître en tête du rapport plutôt que noyé entre deux rubriques.
  return out.sort((a, b) => {
    if (a.scope !== b.scope) return a.scope === "period" ? -1 : 1;
    return a.label.localeCompare(b.label, "fr");
  });
}

function sumOf(lines: ImportLine[], measure: DeclaredTotal["measure"]): number {
  const kept = measure === "gross" ? lines : lines.filter((l) => l.direction === measure);
  return kept.reduce((total, l) => total + l.amount, 0);
}

function toAnalysis(
  sheet: Sheet,
  parse: SheetParse,
  checkpoints: ImportCheckpoint[],
): ImportAnalysis {
  const income = parse.lines
    .filter((l) => l.direction === "income")
    .reduce((t, l) => t + l.amount, 0);
  const expense = parse.lines
    .filter((l) => l.direction === "expense")
    .reduce((t, l) => t + l.amount, 0);

  const declaredIncome = parse.declared.find(
    (d) => d.scope === "period" && d.measure === "income",
  );
  const declaredExpense = parse.declared.find(
    (d) => d.scope === "period" && d.measure === "expense",
  );

  const categories = distinct(
    parse.lines.filter((l) => l.direction === "expense").map((l) => l.category),
  );
  const sources = distinct(
    parse.lines.filter((l) => l.direction === "income").map((l) => l.category),
  );

  return {
    periodLabel: parse.periodLabel ?? sheet.name,
    lines: parse.lines,
    totals: {
      income,
      expense,
      declaredIncome: declaredIncome?.value ?? null,
      declaredExpense: declaredExpense?.value ?? null,
    },
    checkpoints,
    checkSummary: {
      passed: checkpoints.filter((c) => c.ok).length,
      total: checkpoints.length,
    },
    directionsVerifiable: parse.directionsCertain,
    // Le serveur ne connaît pas encore les catégories existantes à ce stade :
    // c'est `commit` qui crée ce qui manque. L'écran de relecture propose de
    // fusionner avant d'en arriver là.
    categories: { known: [], toCreate: categories },
    incomeSources: { known: [], toCreate: sources },
    warnings: parse.notes,
  };
}

function distinct(values: Array<string | undefined>): string[] {
  const seen = new Set<string>();
  for (const v of values) {
    const t = v?.trim();
    if (t) seen.add(t);
  }
  return [...seen].sort((a, b) => a.localeCompare(b, "fr"));
}

export { findBlocks, parseSheet };
