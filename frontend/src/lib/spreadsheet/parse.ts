import type { ImportLine } from "@/types/import";

import { type Block, cellText, isBlank, normalize } from "./grid";
import {
  type Direction,
  type Field,
  directionOfText,
  directionOfTitle,
  findHeaderRow,
  looksLikeDataRow,
  periodOfTitle,
  sniffDirectionColumn,
} from "./headers";
import { type DateOrder, detectDateOrder, parseAmount, parseDate } from "./values";

/**
 * Un total annoncé par le fichier. C'est l'arbitre de tout le module : sans lui
 * un parseur ne peut pas savoir qu'il s'est trompé, et un parseur tolérant qui
 * ne peut pas savoir qu'il s'est trompé est pire qu'un parseur strict.
 */
export interface DeclaredTotal {
  scope: "period" | "category";
  measure: Direction | "gross";
  /** Nom de la catégorie, ou libellé de la période. */
  label: string;
  value: number;
}

export interface SheetParse {
  lines: ImportLine[];
  declared: DeclaredTotal[];
  periodLabel: string | null;
  /** Blocs qu'on n'a pas su lire — la matière première du repli vers l'IA. */
  unread: Block[];
  notes: string[];
  /**
   * Le sens de CHAQUE ligne a-t-il été lu dans le document, ou supposé ?
   * Faux dès qu'une seule ligne a été rangée en dépense faute de mieux — car
   * c'est alors une supposition invérifiable, qu'il faut faire confirmer.
   */
  directionsCertain: boolean;
}

const MAX_LABEL = 280;
const MAX_CATEGORY = 60;

/** Libellés de blocs qui annoncent un solde : dérivé, donc jamais un contrôle. */
const BALANCE = /^(solde|balance|reste|difference|net|resultat|ecart)/;

export function parseSheet(blocks: Block[]): SheetParse {
  const lines: ImportLine[] = [];
  const declared: DeclaredTotal[] = [];
  const unread: Block[] = [];
  const notes: string[] = [];
  let periodLabel: string | null = null;
  let directionsCertain = true;

  for (const block of blocks) {
    const header = findHeaderRow(block.grid);

    if (header === null) {
      const totals = readTotalsBlock(block);
      if (totals.length > 0) declared.push(...totals);
      else if (!isDecorative(block)) unread.push(block);
      continue;
    }

    const table = readTransactionTable(block, header.row, header.columns);
    if (table.lines.length === 0) {
      unread.push(block);
      continue;
    }
    lines.push(...table.lines);
    notes.push(...table.notes);
    if (!table.directionsCertain) directionsCertain = false;
    periodLabel ??= table.periodLabel;

    // Un tableau peut porter sa propre ligne de total en pied — on la récupère
    // au lieu de la jeter, c'est un contrôle gratuit.
    declared.push(...table.trailingTotals);
  }

  // Quand rien dans le document ne dit le sens, tout a été rangé en dépense par
  // défaut. Il faut le DIRE : l'écran de confirmation existant ne présente que
  // les lignes classées en entrée — utile pour un carnet manuscrit, où le
  // modèle sur-classe en entrée, mais aveugle ici, où le biais est inverse.
  if (!directionsCertain && lines.length > 0) {
    notes.push(
      "Ton fichier n'indique nulle part ce qui entre et ce qui sort : j'ai tout compté en dépense. Corrige les lignes qui sont en réalité des revenus.",
    );
  }

  return {
    lines,
    // Un même avertissement vaut pour la feuille entière, pas par tableau :
    // le répéter une fois par bloc le transformerait en bruit.
    declared: dedupe(declared, notes),
    periodLabel,
    unread,
    notes: [...new Set(notes)],
    directionsCertain,
  };
}

/**
 * Un bloc d'une seule cellule, ou sans le moindre nombre, ne porte aucune
 * donnée : c'est un titre orphelin, une note, une cellule de mise en forme. On
 * ne le compte pas comme « non lu », sinon le moindre fichier décoré
 * basculerait vers l'IA sans raison.
 */
function isDecorative(block: Block): boolean {
  let numbers = 0;
  let cells = 0;
  for (const row of block.grid) {
    for (const cell of row) {
      if (isBlank(cell)) continue;
      cells++;
      if (parseAmount(cell) !== null) numbers++;
    }
  }
  return cells <= 2 || numbers === 0;
}

interface TableRead {
  lines: ImportLine[];
  trailingTotals: DeclaredTotal[];
  periodLabel: string | null;
  notes: string[];
  directionsCertain: boolean;
}

function readTransactionTable(
  block: Block,
  headerRow: number,
  columns: Partial<Record<Field, number>>,
): TableRead {
  const grid = block.grid;
  const notes: string[] = [];
  const lines: ImportLine[] = [];
  const trailingTotals: DeclaredTotal[] = [];
  let directionsCertain = true;

  const titleDirection = directionOfTitle(grid, headerRow);
  const periodLabel = periodOfTitle(grid, headerRow);

  // L'ordre jour/mois se décide sur la colonne entière, jamais ligne par ligne.
  const dateCol = columns.date as number;
  const dateCells = grid.slice(headerRow + 1).map((r) => r[dateCol] ?? null);
  const { order, certain } = detectDateOrder(dateCells);
  if (!certain && dateCells.some((c) => typeof c === "string")) {
    notes.push(
      "Les dates de ce fichier sont ambiguës (jour et mois tous deux ≤ 12). Je les ai lues au format jour/mois — vérifie quelques lignes.",
    );
  }

  const taken = Object.values(columns).filter(
    (v): v is number => typeof v === "number",
  );
  const directionCol =
    columns.direction ?? sniffDirectionColumn(grid, headerRow, taken) ?? null;

  for (let r = headerRow + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];

    if (!looksLikeDataRow(row, columns, order)) {
      const total = readTotalRow(row, titleDirection);
      if (total !== null) trailingTotals.push(total);
      continue;
    }

    const date = parseDate(row[dateCol] ?? null, order) as string;
    const resolved = resolveAmount(row, columns, directionCol, titleDirection);
    if (resolved === null) continue;
    if (!resolved.certain) directionsCertain = false;

    const category = pick(row, columns.category, MAX_CATEGORY);
    const label = pick(row, columns.label, MAX_LABEL) || category || "Sans libellé";

    lines.push({
      date,
      label,
      amount: resolved.amount,
      direction: resolved.direction,
      ...(category ? { category } : {}),
    });
  }

  return { lines, trailingTotals, periodLabel, notes, directionsCertain };
}

function pick(
  row: ReturnType<() => Block["grid"][number]>,
  col: number | undefined,
  max: number,
): string {
  if (col === undefined) return "";
  return cellText(row[col] ?? null).slice(0, max);
}

/**
 * Détermine montant ET sens, par ordre de fiabilité décroissante.
 *
 * L'ordre compte : une colonne « Sens » explicite bat toujours une déduction, et
 * le titre du bloc n'intervient qu'en dernier recours — il est vrai pour tout
 * le tableau, donc incapable de distinguer une ligne de l'autre.
 */
function resolveAmount(
  row: Block["grid"][number],
  columns: Partial<Record<Field, number>>,
  directionCol: number | null,
  titleDirection: Direction | null,
): { amount: number; direction: Direction; certain: boolean } | null {
  // 1. Colonnes débit / crédit séparées : le sens est dans la colonne remplie.
  const debit = columns.debit !== undefined ? parseAmount(row[columns.debit] ?? null) : null;
  const credit = columns.credit !== undefined ? parseAmount(row[columns.credit] ?? null) : null;
  if (debit !== null && debit !== 0 && (credit === null || credit === 0)) {
    return { amount: Math.abs(debit), direction: "expense", certain: true };
  }
  if (credit !== null && credit !== 0 && (debit === null || debit === 0)) {
    return { amount: Math.abs(credit), direction: "income", certain: true };
  }

  const raw = columns.amount !== undefined ? parseAmount(row[columns.amount] ?? null) : null;
  const amount = raw ?? debit ?? credit;
  if (amount === null || amount === 0) return null;

  // 2. Colonne de sens explicite.
  if (directionCol !== null) {
    const d = directionOfText(cellText(row[directionCol] ?? null));
    if (d !== null) return { amount: Math.abs(amount), direction: d, certain: true };
  }

  // 3. Montant signé.
  if (amount < 0) return { amount: Math.abs(amount), direction: "expense", certain: true };

  // 4. Titre du bloc.
  if (titleDirection !== null) {
    return { amount: Math.abs(amount), direction: titleDirection, certain: true };
  }

  // Rien ne dit le sens. On suppose une dépense — c'est le cas de très loin le
  // plus fréquent — mais l'écran de relecture le signalera comme non vérifié.
  return { amount: Math.abs(amount), direction: "expense", certain: false };
}

/**
 * Lit un bloc de totaux : des paires « libellé → nombre ».
 *
 * Le nombre est cherché dans la DERNIÈRE cellule numérique de la ligne, et le
 * libellé est tout ce qui la précède. C'est ce qui permet de lire aussi bien
 * « Total Nourriture | 33 025 » que « Total | Nourriture | | 33 025 ».
 */
function readTotalsBlock(block: Block): DeclaredTotal[] {
  const grid = block.grid;
  // Le sens se lit sur la PREMIÈRE ligne du bloc, et nulle part ailleurs.
  // Balayer tout le bloc ferait dire « entrées » au récapitulatif général au
  // seul motif qu'il contient une ligne « Total Entrées » — et ses totaux de
  // sorties seraient alors rangés du mauvais côté.
  const blockDirection = directionOfText(
    (grid[0] ?? []).map((c) => cellText(c)).join(" "),
  );
  const out: DeclaredTotal[] = [];

  for (const row of grid) {
    const total = readTotalRow(row, blockDirection);
    if (total !== null) out.push(total);
  }

  return out;
}

function readTotalRow(
  row: Block["grid"][number],
  blockDirection: Direction | null,
): DeclaredTotal | null {
  let valueIndex = -1;
  let value: number | null = null;

  for (let c = row.length - 1; c >= 0; c--) {
    const v = parseAmount(row[c] ?? null);
    if (v !== null) {
      valueIndex = c;
      value = v;
      break;
    }
  }
  if (value === null) return null;

  // Les cellules fusionnées ont été recopiées sur toute leur largeur : sans
  // cette déduplication, « TOTAL SORTIES » étalé sur trois colonnes deviendrait
  // « TOTAL SORTIES TOTAL SORTIES TOTAL SORTIES ».
  const label = row
    .slice(0, valueIndex)
    .map((cell) => cellText(cell))
    .filter((t, i, all) => t !== "" && t !== all[i - 1])
    .join(" ")
    .trim();
  if (label === "") return null;

  const n = normalize(label);
  if (BALANCE.test(n)) return null;

  const own = directionOfText(label);
  const isTotalWord = /\b(?:totaux|total)\b/.test(n);

  // « Total Entrées », « TOTAL SORTIES » : un total de période, pas de catégorie.
  if (own !== null && isTotalWord && stripTotal(n) === normalize(directionWord(own))) {
    return { scope: "period", measure: own, label, value };
  }
  // « Total Entrées » écrit sans le mot « total » (« ENTRÉES » seul en pied).
  if (own !== null && stripTotal(n) === normalize(directionWord(own))) {
    return { scope: "period", measure: own, label, value };
  }

  const measure = own ?? blockDirection;
  if (measure === null) return null;

  const name = titleCase(stripTotal(label));
  if (name === "") return null;

  return { scope: "category", measure, label: name, value };
}

function directionWord(d: Direction): string {
  return d === "income" ? "entrees" : "sorties";
}

/**
 * « Total Nourriture » → « Nourriture ».
 *
 * Le pluriel de « total » est « totaux », pas « totals » : `totaux?` en
 * expression régulière voudrait dire « totau » suivi d'un « x » facultatif, et
 * ne reconnaîtrait donc JAMAIS le singulier. Il faut énumérer les deux formes.
 */
function stripTotal(label: string): string {
  return label.replace(/^\s*(?:totaux|total)\s+/i, "").trim();
}

function titleCase(s: string): string {
  return s.slice(0, MAX_CATEGORY).trim();
}

/**
 * Un même total peut être écrit deux fois — le fichier de référence annonce
 * « TOTAL ENTRÉES » sous son tableau ET « Total Entrées » dans le récapitulatif.
 * C'est une redondance, pas une erreur… sauf quand les deux ne disent pas la
 * même chose, et là il faut le signaler plutôt que d'en choisir un au hasard.
 */
function dedupe(totals: DeclaredTotal[], notes: string[]): DeclaredTotal[] {
  const byKey = new Map<string, DeclaredTotal>();
  const conflicting = new Set<string>();

  for (const t of totals) {
    const key = `${t.scope}|${t.measure}|${normalize(t.label)}`;
    const seen = byKey.get(key);
    if (seen === undefined) byKey.set(key, t);
    else if (seen.value !== t.value) conflicting.add(key);
  }

  for (const key of conflicting) {
    const t = byKey.get(key);
    byKey.delete(key);
    if (t) {
      notes.push(
        `Ton fichier annonce deux totaux différents pour « ${t.label} ». Je n'ai vérifié ni l'un ni l'autre.`,
      );
    }
  }

  return [...byKey.values()];
}

export type { DateOrder };
