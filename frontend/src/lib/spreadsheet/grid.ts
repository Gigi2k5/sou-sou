/**
 * Géométrie d'une feuille de calcul.
 *
 * Un tableur n'est pas un texte : c'est un plan. Et les gens y posent
 * PLUSIEURS tableaux côte à côte, parce que rien ne les en empêche. Le fichier
 * qui a motivé ce module tient trois tableaux sur une seule feuille — entrées
 * en colonnes A-D, sorties en F-I, récapitulatif en K-M.
 *
 * Converti ligne par ligne, ça donne des phrases sans queue ni tête :
 *
 *   9/1/2026 | debut | Autre | 140000 | | 9/1/2026 | zem | Déplacement | 1200
 *
 * Trois faits sans rapport sur une même ligne, et un désalignement complet dès
 * que l'un des tableaux se termine avant l'autre. D'où ce module : on découpe
 * la feuille en îlots AVANT de chercher à comprendre quoi que ce soit.
 */

/** Ce qu'une cellule peut contenir une fois lue. */
export type Cell = string | number | boolean | Date | null;

export type Grid = Cell[][];

export interface Sheet {
  name: string;
  grid: Grid;
}

/** Un îlot de cellules non vides, isolé du reste par du blanc. */
export interface Block {
  top: number;
  left: number;
  /** Inclusives. */
  bottom: number;
  right: number;
  /** Le contenu de l'îlot, déjà découpé aux bonnes bornes. */
  grid: Grid;
}

export function isBlank(cell: Cell): boolean {
  if (cell === null || cell === undefined) return true;
  if (typeof cell === "string") return cell.trim() === "";
  return false;
}

/** Texte d'une cellule, quel que soit son type. Jamais `null`. */
export function cellText(cell: Cell): string {
  if (cell === null || cell === undefined) return "";
  if (cell instanceof Date) return cell.toISOString().slice(0, 10);
  if (typeof cell === "number") return String(cell);
  if (typeof cell === "boolean") return cell ? "vrai" : "faux";
  return cell.trim();
}

/**
 * Normalise un libellé pour la comparaison : minuscules, sans accents, sans
 * ponctuation, espaces réduits.
 *
 * Indispensable parce qu'on compare des en-têtes écrits par des humains :
 * « Montant (FCFA) », « MONTANT », « montant  », « Montant F CFA » doivent
 * tous tomber sur le même mot.
 */
export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Découpe une grille en îlots.
 *
 * La découpe se fait en deux temps, et l'ordre compte :
 *
 *   1. on isole les BANDES de colonnes, séparées par des colonnes entièrement
 *      vides — c'est ce qui sépare « entrées » de « sorties » de « résumé » ;
 *   2. dans chaque bande, on isole les GROUPES de lignes, séparés par des
 *      lignes entièrement vides — c'est ce qui sépare un tableau de son bloc
 *      de totaux, vingt lignes plus bas.
 *
 * On a d'abord essayé la contiguïté de cellule à cellule, ce qui paraît plus
 * naturel. C'était faux : une ligne « TOTAL SORTIES | (vide) | 10 000 » y
 * devient DEUX îlots, un libellé sans nombre et un nombre sans libellé. Le
 * total était alors perdu — et un total perdu, c'est un contrôle en moins,
 * donc une mauvaise lecture qui passe inaperçue.
 *
 * Raisonner par bandes règle le cas : le libellé et son montant appartiennent à
 * la même bande, donc au même îlot, quel que soit le nombre de cellules vides
 * entre eux.
 */
export function findBlocks(grid: Grid): Block[] {
  const height = grid.length;
  const width = grid.reduce((max, row) => Math.max(max, row.length), 0);
  if (height === 0 || width === 0) return [];

  const at = (r: number, c: number): Cell => grid[r]?.[c] ?? null;

  const columnUsed: boolean[] = [];
  for (let c = 0; c < width; c++) {
    let used = false;
    for (let r = 0; r < height && !used; r++) used = !isBlank(at(r, c));
    columnUsed.push(used);
  }

  const blocks: Block[] = [];

  for (const [left, right] of runsOf(columnUsed)) {
    const rowUsed: boolean[] = [];
    for (let r = 0; r < height; r++) {
      let used = false;
      for (let c = left; c <= right && !used; c++) used = !isBlank(at(r, c));
      rowUsed.push(used);
    }

    for (const [top, bottom] of runsOf(rowUsed)) {
      const block: Block = { top, left, bottom, right, grid: [] };
      block.grid = sliceGrid(grid, block);
      blocks.push(block);
    }
  }

  return blocks.sort((a, b) => a.top - b.top || a.left - b.left);
}

/** Les plages `[début, fin]` de `true` consécutifs. */
function runsOf(flags: boolean[]): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  let start = -1;

  for (let i = 0; i < flags.length; i++) {
    if (flags[i] && start === -1) start = i;
    else if (!flags[i] && start !== -1) {
      runs.push([start, i - 1]);
      start = -1;
    }
  }
  if (start !== -1) runs.push([start, flags.length - 1]);

  return runs;
}

function sliceGrid(grid: Grid, block: Block): Grid {
  const out: Grid = [];
  for (let r = block.top; r <= block.bottom; r++) {
    const row: Cell[] = [];
    for (let c = block.left; c <= block.right; c++) {
      row.push(grid[r]?.[c] ?? null);
    }
    out.push(row);
  }
  return out;
}
