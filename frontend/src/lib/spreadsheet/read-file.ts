import Papa from "papaparse";

import type { Cell, Grid, Sheet } from "./grid";

/**
 * Au-delà, ce n'est plus un carnet de comptes. La limite protège surtout la
 * mémoire du téléphone : `xlsx` décompresse tout le classeur d'un coup.
 */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** Garde-fou contre un classeur à trois cents onglets. */
const MAX_SHEETS = 60;

export class SpreadsheetError extends Error {}

export type FileKind = "csv" | "excel";

export function detectFileKind(file: File): FileKind | null {
  const name = file.name.toLowerCase();
  if (/\.(csv|tsv|txt)$/.test(name)) return "csv";
  if (/\.(xlsx|xlsm|xlsb|xls|ods)$/.test(name)) return "excel";
  return null;
}

/** Les extensions proposées au sélecteur de fichiers. */
export const ACCEPTED_EXTENSIONS =
  ".csv,.tsv,.txt,.xlsx,.xlsm,.xlsb,.xls,.ods";

export async function readSpreadsheet(file: File): Promise<Sheet[]> {
  if (file.size > MAX_FILE_BYTES) {
    throw new SpreadsheetError(
      `Ce fichier fait ${Math.round(file.size / 1024 / 1024)} Mo, la limite est de ${MAX_FILE_BYTES / 1024 / 1024} Mo.`,
    );
  }

  const kind = detectFileKind(file);
  if (kind === null) {
    throw new SpreadsheetError(
      "Format non reconnu. J'accepte les fichiers Excel (.xlsx, .xls, .ods) et les fichiers texte (.csv, .tsv).",
    );
  }

  const sheets = kind === "csv" ? await readCsv(file) : await readExcel(file);

  const useful = sheets.filter((s) => s.grid.some((r) => r.length > 0));
  if (useful.length === 0) {
    throw new SpreadsheetError("Ce fichier est vide.");
  }
  return useful;
}

async function readCsv(file: File): Promise<Sheet[]> {
  const text = await file.text();

  // `skipEmptyLines: false` est volontaire et important : les lignes vides sont
  // ce qui sépare les tableaux les uns des autres. Les jeter reviendrait à
  // coller le bloc des totaux à la suite des transactions.
  const parsed = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: false,
    dynamicTyping: false,
  });

  const grid: Grid = parsed.data.map((row) =>
    Array.isArray(row) ? row.map((v) => (v === "" ? null : v)) : [],
  );

  return [{ name: file.name.replace(/\.[^.]+$/, ""), grid }];
}

/**
 * Recopie la valeur d'une cellule fusionnée dans toutes les cases qu'elle
 * recouvre.
 *
 * Sans ça, « TOTAL SORTIES » fusionné sur trois colonnes n'occupe que la
 * première : la découpe en îlots voit un libellé en colonne A, deux colonnes
 * vides, puis un montant en colonne D — et en conclut qu'il s'agit de deux
 * tableaux sans rapport. Le total est alors perdu, donc plus rien ne vérifie
 * notre lecture.
 *
 * On rétablit ce que l'utilisateur VOIT : une bande pleine.
 */
function expandMerges(
  grid: Grid,
  merges: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> | undefined,
): void {
  if (!merges) return;

  for (const { s, e } of merges) {
    const value = grid[s.r]?.[s.c] ?? null;
    if (value === null) continue;
    for (let r = s.r; r <= e.r; r++) {
      const row = (grid[r] ??= []);
      for (let c = s.c; c <= e.c; c++) {
        if (r === s.r && c === s.c) continue;
        row[c] = value;
      }
    }
  }
}

async function readExcel(file: File): Promise<Sheet[]> {
  // Chargement à la demande : la bibliothèque pèse plusieurs centaines de Ko et
  // l'immense majorité des visites ne verra jamais cet écran.
  const XLSX = await import("xlsx");
  const buffer = await file.arrayBuffer();

  let workbook;
  try {
    workbook = XLSX.read(new Uint8Array(buffer), {
      type: "array",
      // Convertit les cellules de date en objets `Date`. Sans ça on reçoit le
      // numéro de série d'Excel — 45870 — et il n'y a plus aucun moyen de le
      // distinguer d'un montant.
      cellDates: true,
      cellFormula: false,
      cellHTML: false,
    });
  } catch {
    throw new SpreadsheetError(
      "Je n'ai pas réussi à ouvrir ce fichier. S'il est protégé par un mot de passe, enlève-le puis réessaie.",
    );
  }

  const names = workbook.SheetNames.slice(0, MAX_SHEETS);

  return names.map((name) => {
    const ws = workbook.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Cell[]>(ws, {
      header: 1,
      raw: true,
      defval: null,
      blankrows: true,
    });
    const grid = rows.map((r) => (Array.isArray(r) ? r : []));
    expandMerges(grid, ws["!merges"]);
    return { name, grid };
  });
}
