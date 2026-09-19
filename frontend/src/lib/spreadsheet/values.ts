import { type Cell, cellText, normalize } from "./grid";

/**
 * Lecture tolérante des valeurs d'un tableur.
 *
 * Tout ce qui suit existe parce qu'un tableur n'impose RIEN. Le même fichier
 * peut contenir « 1 350 », « 1350 », « 1 350 F », « 1.350,00 » et « (1 200) »
 * dans la même colonne, selon l'humeur du jour et le copier-coller d'origine.
 */

/** Toutes les formes d'espace qu'un tableur peut glisser dans un nombre. */
const SPACES = /[\s\u00a0\u202f\u2009\u2007]/g;

/**
 * Convertit une cellule en montant.
 *
 * Retourne `null` si ce n'est pas un nombre — c'est le signal qui empêche une
 * ligne de titre d'être prise pour une transaction.
 *
 * Le signe est conservé : une colonne « Montant » à valeurs négatives est une
 * façon très répandue d'exprimer le sens, et c'est le parseur de sens qui
 * décidera quoi en faire, pas celui-ci.
 */
export function parseAmount(cell: Cell): number | null {
  if (typeof cell === "number") return Number.isFinite(cell) ? cell : null;
  if (cell instanceof Date || typeof cell === "boolean") return null;

  const raw = cellText(cell);
  if (raw === "") return null;

  // La comptabilité écrit les négatifs entre parenthèses. Si on ne le sait pas,
  // « (1 200) » devient 1200 et le solde se trompe du double.
  const parenthesized = /^\(.*\)$/.test(raw.trim());

  let s = raw.replace(SPACES, "");
  const negative = parenthesized || /^-/.test(s) || /-$/.test(s);

  // On retire devises et parasites : F, FCFA, XOF, CFA, €, $, %, parenthèses…
  s = s.replace(/[()]/g, "").replace(/[^0-9.,]/g, "");
  if (s === "") return null;

  s = disambiguateSeparators(s);

  const value = Number(s);
  if (!Number.isFinite(value)) return null;
  return negative ? -Math.abs(value) : value;
}

/**
 * Tranche entre séparateur de milliers et séparateur décimal.
 *
 * Règle : quand les deux symboles sont présents, le DERNIER est le décimal
 * (« 1.350,00 » en français, « 1,350.00 » en anglais). Quand un seul est
 * présent, il n'est décimal que s'il ne découpe pas des groupes de trois
 * chiffres — « 1,350 » est mille trois cent cinquante, pas 1,35.
 *
 * Ce dernier point est un choix, pas une certitude : « 1,5 » reste décimal
 * parce que 5 n'est pas un groupe de trois. C'est le comportement attendu en
 * FCFA, monnaie sans centimes en pratique, où un nombre à trois décimales
 * n'existe pas alors que les milliers sont partout.
 */
function disambiguateSeparators(s: string): string {
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");

  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? "." : ",";
    const thousands = decimal === "." ? "," : ".";
    return s.split(thousands).join("").replace(decimal, ".");
  }

  const sep = lastDot >= 0 ? "." : lastComma >= 0 ? "," : null;
  if (sep === null) return s;

  const parts = s.split(sep);
  const tail = parts[parts.length - 1];
  const groupsOfThree = parts.length > 1 && parts.slice(1).every((p) => p.length === 3);

  if (groupsOfThree && tail.length === 3) return parts.join("");
  return parts.slice(0, -1).join("") + "." + tail;
}

export type DateOrder = "DMY" | "MDY";

/** `2026-09-01` à partir des composantes LOCALES — jamais `toISOString()`. */
function iso(year: number, month: number, day: number): string | null {
  if (year < 2000 || year > 2100) return null;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  // Rejette le 31 février et consorts : `Date` les reporte silencieusement.
  if (d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Une cellule de type date arrive en objet `Date` construit par SheetJS dans le
 * fuseau LOCAL. On lit donc ses composantes locales : passer par
 * `toISOString()` décalerait d'un jour à l'ouest de Greenwich — c'est-à-dire
 * exactement là où vivent les utilisateurs de cette application.
 */
function fromDateObject(d: Date): string | null {
  if (Number.isNaN(d.getTime())) return null;
  return iso(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

const MONTHS: Record<string, number> = {
  janvier: 1, janv: 1, jan: 1,
  fevrier: 2, fevr: 2, fev: 2, feb: 2,
  mars: 3, mar: 3,
  avril: 4, avr: 4, apr: 4,
  mai: 5, may: 5,
  juin: 6, jun: 6,
  juillet: 7, juil: 7, jul: 7,
  aout: 8, aug: 8,
  septembre: 9, sept: 9, sep: 9,
  octobre: 10, oct: 10,
  novembre: 11, nov: 11,
  decembre: 12, dec: 12,
};

/**
 * Convertit une cellule en date ISO.
 *
 * `order` tranche les dates ambiguës du type `9/1/2026`. Il est déterminé une
 * fois pour toute la colonne par `detectDateOrder` — décider ligne par ligne
 * produirait un carnet où le 9 janvier et le 1er septembre cohabitent.
 */
export function parseDate(cell: Cell, order: DateOrder = "DMY"): string | null {
  if (cell instanceof Date) return fromDateObject(cell);

  // Un numéro de série Excel nu (le format de date a été perdu au passage en
  // CSV, par exemple). 45870 = 1er septembre 2026. En deçà de 20000 on
  // considère que c'est un montant, pas une date de 1954.
  if (typeof cell === "number") {
    if (cell < 20_000 || cell > 80_000) return null;
    const ms = Date.UTC(1899, 11, 30) + Math.round(cell) * 86_400_000;
    const d = new Date(ms);
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }

  const raw = cellText(cell);
  if (raw === "") return null;

  const isoMatch = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(raw);
  if (isoMatch) {
    return iso(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const numeric = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(raw.trim());
  if (numeric) {
    const a = Number(numeric[1]);
    const b = Number(numeric[2]);
    let year = Number(numeric[3]);
    if (year < 100) year += 2000;
    const [day, month] = order === "MDY" ? [b, a] : [a, b];
    return iso(year, month, day);
  }

  // « 1 septembre 2026 », « 17 sept 2026 », « Samedi 1 septembre 2026 »
  const words = normalize(raw).split(" ");
  let day: number | null = null;
  let month: number | null = null;
  let year: number | null = null;
  for (const w of words) {
    if (/^\d{1,2}$/.test(w) && day === null) day = Number(w);
    else if (/^\d{4}$/.test(w)) year = Number(w);
    else if (MONTHS[w] !== undefined) month = MONTHS[w];
  }
  if (day !== null && month !== null && year !== null) return iso(year, month, day);

  return null;
}

/**
 * Détermine l'ordre jour/mois d'une colonne entière.
 *
 * Une seule date dont le premier nombre dépasse 12 prouve le format DMY ;
 * l'inverse pour MDY. Le fichier de référence écrit `9/17/2026` — le 17 en
 * deuxième position suffit à établir qu'il est américain, alors même que son
 * auteur est francophone. C'est précisément le genre de détail qu'on ne peut
 * pas deviner et qu'il ne faut pas supposer.
 */
export function detectDateOrder(cells: Cell[]): {
  order: DateOrder;
  certain: boolean;
} {
  let dmy = false;
  let mdy = false;

  for (const cell of cells) {
    // Les vraies cellules de date ne sont jamais ambiguës : on les ignore ici.
    if (cell instanceof Date || typeof cell === "number") continue;
    const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(cellText(cell));
    if (!m) continue;
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a > 12) dmy = true;
    if (b > 12) mdy = true;
  }

  // Contradiction dans une même colonne : le fichier mélange les deux formats.
  // On garde le français par défaut et on signale l'incertitude.
  if (dmy && mdy) return { order: "DMY", certain: false };
  if (mdy) return { order: "MDY", certain: true };
  if (dmy) return { order: "DMY", certain: true };
  return { order: "DMY", certain: false };
}
