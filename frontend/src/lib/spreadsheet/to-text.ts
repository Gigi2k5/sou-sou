import { type Block, type Cell, cellText, findBlocks, isBlank, type Sheet } from "./grid";
import { parseDate } from "./values";

/**
 * Rend une feuille en texte pour le modèle de langage.
 *
 * C'est le repli, et il ne consiste PAS à recopier la feuille telle quelle.
 * Ligne par ligne, trois tableaux côte à côte donnent :
 *
 *   9/1/2026 | debut | Autre | 140000 | | 9/1/2026 | zem | Déplacement | 1200
 *
 * — deux transactions sans rapport sur une seule ligne, et un désalignement
 * total dès que l'un des tableaux se termine avant l'autre. Le découpage en
 * îlots sert donc les deux chemins : il rend le parseur possible, et il rend le
 * modèle nettement plus fiable en lui donnant des tableaux propres.
 *
 * Les dates sont converties en ISO au passage. Une cellule de date d'Excel vaut
 * 45870 en interne ; transmise telle quelle, le modèle invente une date.
 */
export function sheetToText(sheet: Sheet): string {
  const blocks = findBlocks(sheet.grid);
  if (blocks.length === 0) return "";

  const parts = blocks
    .map((block, i) => blockToText(block, i))
    .filter((t) => t !== "");

  return `Feuille « ${sheet.name} »\n\n${parts.join("\n\n")}`;
}

function blockToText(block: Block, index: number): string {
  const rows = block.grid
    .map((row) => row.map(render))
    .filter((row) => row.some((c) => c !== ""));

  if (rows.length === 0) return "";

  // On retire les colonnes entièrement vides : elles n'apportent rien au modèle
  // et lui font consommer des tokens à compter des séparateurs.
  const width = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const keep: number[] = [];
  for (let c = 0; c < width; c++) {
    if (rows.some((r) => (r[c] ?? "") !== "")) keep.push(c);
  }

  const body = rows
    .map((r) => keep.map((c) => r[c] ?? "").join(" | ").replace(/(\s\|)+$/, ""))
    .join("\n");

  return `--- Tableau ${index + 1} ---\n${body}`;
}

function render(cell: Cell): string {
  if (isBlank(cell)) return "";
  if (cell instanceof Date) return parseDate(cell) ?? cellText(cell);
  // Un nombre dans la plage des dates Excel est ambigu ; on ne le convertit
  // PAS ici, faute de savoir si la colonne est une colonne de dates. Le modèle
  // tranchera avec le contexte de la colonne entière, ce que nous ne pouvons
  // pas faire cellule par cellule.
  return cellText(cell);
}
