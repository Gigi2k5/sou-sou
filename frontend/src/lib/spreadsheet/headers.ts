import { type Cell, cellText, type Grid, isBlank, normalize } from "./grid";
import { parseAmount, parseDate } from "./values";

/** Rôle d'une colonne dans un tableau de transactions. */
export type Field =
  | "date"
  | "label"
  | "amount"
  | "category"
  | "direction"
  | "debit"
  | "credit";

/**
 * Synonymes d'en-têtes, du plus spécifique au plus vague.
 *
 * La liste est volontairement longue : elle ne coûte rien et chaque entrée
 * manquante se paie par un fichier qui bascule inutilement vers l'IA. Les
 * comparaisons passent par `normalize`, donc accents, majuscules et ponctuation
 * sont déjà neutralisés — « Montant (FCFA) » arrive ici en « montant fcfa ».
 */
const SYNONYMS: Array<[Field, string[]]> = [
  ["debit", ["debit", "debits", "sortie", "sorties", "depense", "depenses"]],
  ["credit", ["credit", "credits", "entree", "entrees", "recette", "recettes"]],
  ["date", ["date", "jour", "journee", "day", "when", "quand", "le"]],
  [
    "label",
    [
      "nom", "description", "libelle", "intitule", "motif", "detail", "details",
      "label", "name", "designation", "objet", "operation", "poste", "note",
      "notes", "commentaire", "quoi",
    ],
  ],
  [
    "amount",
    [
      "montant", "somme", "prix", "valeur", "amount", "value", "cout", "cout total",
      "total", "fcfa", "xof", "cfa", "francs", "argent",
    ],
  ],
  [
    "category",
    ["categorie", "category", "rubrique", "classe", "famille", "type", "nature"],
  ],
  ["direction", ["sens", "direction", "signe", "flux"]],
];

/** Reconnaît un en-tête. `null` si le mot n'évoque rien. */
export function recognizeHeader(text: string): Field | null {
  const n = normalize(text);
  if (n === "") return null;

  for (const [field, words] of SYNONYMS) {
    if (words.includes(n)) return field;
  }
  // Rattrapage : « Montant (FCFA) » → contient « montant ». On exige le mot
  // entier pour éviter que « date » attrape « mandat ».
  const tokens = n.split(" ");
  for (const [field, words] of SYNONYMS) {
    if (tokens.some((t) => words.includes(t))) return field;
  }
  return null;
}

export interface HeaderRow {
  /** Index de la ligne d'en-tête DANS le bloc. */
  row: number;
  columns: Partial<Record<Field, number>>;
}

/**
 * Cherche la ligne d'en-tête d'un bloc.
 *
 * On exige au minimum une colonne de date ET une colonne de montant : c'est le
 * strict nécessaire pour construire une transaction, et c'est ce qui distingue
 * un tableau de mouvements d'un bloc de totaux (qui n'a jamais de dates).
 *
 * Seules les cinq premières lignes sont examinées. Au-delà, ce n'est plus un
 * en-tête mais une ligne de données qui y ressemble.
 */
export function findHeaderRow(grid: Grid): HeaderRow | null {
  const limit = Math.min(grid.length, 5);

  for (let r = 0; r < limit; r++) {
    const row = grid[r] ?? [];
    const columns: Partial<Record<Field, number>> = {};

    for (let c = 0; c < row.length; c++) {
      const field = recognizeHeader(cellText(row[c]));
      // Premier arrivé, premier servi : si deux colonnes disent « montant »,
      // la seconde sera rattrapée par le reniflage de valeurs.
      if (field !== null && columns[field] === undefined) columns[field] = c;
    }

    const hasAmount =
      columns.amount !== undefined ||
      columns.debit !== undefined ||
      columns.credit !== undefined;

    if (columns.date !== undefined && hasAmount) return { row: r, columns };
  }

  return null;
}

const INCOME_WORDS = [
  "entree", "entrees", "recette", "recettes", "revenu", "revenus", "income",
  "credit", "credits", "gain", "gains", "encaissement", "encaissements",
  "rentree", "rentrees", "in",
];

const EXPENSE_WORDS = [
  "sortie", "sorties", "depense", "depenses", "expense", "expenses", "debit",
  "debits", "charge", "charges", "decaissement", "decaissements", "achat",
  "achats", "out",
];

export type Direction = "income" | "expense";

/** Le sens qu'évoque un texte libre, s'il en évoque un. */
export function directionOfText(text: string): Direction | null {
  const tokens = normalize(text).split(" ");
  const income = tokens.some((t) => INCOME_WORDS.includes(t));
  const expense = tokens.some((t) => EXPENSE_WORDS.includes(t));
  // « Entrées et sorties » ne tranche rien : mieux vaut ne rien dire.
  if (income && expense) return null;
  if (income) return "income";
  if (expense) return "expense";
  return null;
}

/**
 * Le sens porté par le TITRE du bloc.
 *
 * C'est ce qui sauve le fichier de référence : ses lignes ne portent aucune
 * indication de sens, mais le bloc s'appelle « ENTRÉES - Septembre 2026 » ou
 * « SORTIES - Septembre 2026 ». L'information est là, simplement pas là où on
 * l'attendrait.
 */
export function directionOfTitle(grid: Grid, headerRow: number): Direction | null {
  for (let r = 0; r < headerRow; r++) {
    for (const cell of grid[r] ?? []) {
      const d = directionOfText(cellText(cell));
      if (d !== null) return d;
    }
  }
  return null;
}

/** « ENTRÉES - Septembre 2026 » → « Septembre 2026 ». */
export function periodOfTitle(grid: Grid, headerRow: number): string | null {
  const MONTHS =
    /(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\s+(\d{4})/;
  for (let r = 0; r < headerRow; r++) {
    for (const cell of grid[r] ?? []) {
      const m = MONTHS.exec(normalize(cellText(cell)));
      if (m) return `${m[1][0].toUpperCase()}${m[1].slice(1)} ${m[2]}`;
    }
  }
  return null;
}

/**
 * Repère une colonne de sens à ses VALEURS plutôt qu'à son nom.
 *
 * Un fichier peut titrer cette colonne « Type », « T », ou ne pas la titrer du
 * tout. En revanche son contenu, lui, est reconnaissable : une colonne où la
 * majorité des cellules disent « entrée » ou « sortie » est une colonne de
 * sens, quel que soit l'intitulé. On exige les deux tiers pour ne pas confondre
 * avec une colonne de catégories où figurerait « Recettes diverses ».
 */
export function sniffDirectionColumn(
  grid: Grid,
  headerRow: number,
  taken: number[],
): number | null {
  const width = grid.reduce((m, r) => Math.max(m, r.length), 0);

  for (let c = 0; c < width; c++) {
    if (taken.includes(c)) continue;
    let filled = 0;
    let directional = 0;

    for (let r = headerRow + 1; r < grid.length; r++) {
      const cell = grid[r]?.[c] ?? null;
      if (isBlank(cell)) continue;
      filled++;
      if (directionOfText(cellText(cell)) !== null) directional++;
    }

    if (filled >= 3 && directional >= Math.ceil(filled * (2 / 3))) return c;
  }

  return null;
}

/**
 * Une ligne est-elle une ligne de données ?
 *
 * Elle doit porter une date lisible ET un montant. C'est le filtre qui écarte
 * les lignes de séparation, les sous-titres et — surtout — les lignes de total
 * glissées en bas d'un tableau, qui ont un montant mais pas de date.
 */
export function looksLikeDataRow(
  row: Cell[],
  columns: Partial<Record<Field, number>>,
  order: Parameters<typeof parseDate>[1],
): boolean {
  const dateCol = columns.date;
  if (dateCol === undefined) return false;
  if (parseDate(row[dateCol] ?? null, order) === null) return false;

  for (const key of ["amount", "debit", "credit"] as const) {
    const c = columns[key];
    if (c !== undefined && parseAmount(row[c] ?? null) !== null) return true;
  }
  return false;
}
