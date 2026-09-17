import type {
  EditableLine,
  ImportCheckpoint,
  ImportLine,
} from "@/types/import";

/** Les montants sont entiers en FCFA : au-delà d'un demi-franc, c'est un écart. */
const TOLERANCE = 0.5;

/**
 * Ce qu'un document annonce pour une tranche de temps.
 *
 * `gross` est le cas dominant — un carnet écrit « Total = 32000 », un seul
 * nombre, sans distinguer entrées et sorties. Il reste volontairement séparé de
 * `income`/`expense` : si on répartissait ce total unique selon le classement
 * des lignes, la référence bougerait dès que l'utilisateur reclasse une ligne.
 * Une référence qui bouge ne vérifie plus rien — elle fabrique des écarts
 * imaginaires au moment précis où l'utilisateur corrige.
 */
export interface Declared {
  gross: number | null;
  income: number | null;
  expense: number | null;
}

/** Le résultat d'une confrontation annoncé / calculé. */
export interface Comparison {
  declared: Declared;
  computedGross: number;
  computedIncome: number;
  computedExpense: number;
  grossGap: number | null;
  incomeGap: number | null;
  expenseGap: number | null;
  /** Le document annonce au moins un total pour cette tranche. */
  verifiable: boolean;
  hasGap: boolean;
}

export interface DayReport extends Comparison {
  /** ISO `YYYY-MM-DD`. */
  date: string;
  lines: EditableLine[];
}

export interface WeekReport extends Comparison {
  label: string;
  from: string;
  to: string;
}

// -----------------------------------------------------------------------------
// Lecture des contrôles renvoyés par le serveur
// -----------------------------------------------------------------------------

/**
 * Extrait les totaux journaliers annoncés.
 *
 * On ne garde que le `declared` : le `computed` du serveur devient caduc dès la
 * première correction. C'est tout l'intérêt de recalculer côté client — l'écart
 * se résorbe sous les yeux de l'utilisateur pendant qu'il corrige.
 */
export function declaredByDay(
  checkpoints: ImportCheckpoint[],
): Map<string, Declared> {
  const map = new Map<string, Declared>();
  for (const c of checkpoints) {
    if (c.scope !== "day") continue;
    const entry = map.get(c.label) ?? emptyDeclared();
    entry[c.direction] = c.declared;
    map.set(c.label, entry);
  }
  return map;
}

/** Totaux de période annoncés, s'ils existent. */
export function declaredPeriod(checkpoints: ImportCheckpoint[]): Declared {
  const out = emptyDeclared();
  for (const c of checkpoints) {
    if (c.scope === "period") out[c.direction] = c.declared;
  }
  return out;
}

// -----------------------------------------------------------------------------
// Journées
// -----------------------------------------------------------------------------

/**
 * Regroupe les lignes par jour et confronte chaque journée à ses totaux.
 *
 * L'ordre de sortie porte toute l'intention de l'écran de revue : les journées
 * EN ÉCART d'abord. Personne ne relit cent lignes — mais tout le monde relit la
 * seule journée dont l'addition ne tombe pas juste.
 *
 * Ce tri remplace celui par « confiance » du modèle, mesuré inutilisable : sur
 * un carnet réel il renvoie 1 partout, y compris sur la ligne qu'il a mal
 * classée. Le carnet, lui, ne se trompe pas d'addition — et quand il se trompe,
 * c'est précisément ce qu'on veut montrer.
 */
export function buildDayReports(
  lines: EditableLine[],
  declared: Map<string, Declared>,
): DayReport[] {
  const byDate = new Map<string, EditableLine[]>();
  for (const line of lines) {
    const bucket = byDate.get(line.date);
    if (bucket) bucket.push(line);
    else byDate.set(line.date, [line]);
  }

  // Une journée annoncée dont toutes les lignes ont été supprimées doit rester
  // visible : sa disparition est précisément l'anomalie à montrer.
  for (const date of declared.keys()) {
    if (!byDate.has(date)) byDate.set(date, []);
  }

  const reports: DayReport[] = [];
  for (const [date, dayLines] of byDate) {
    reports.push({
      date,
      lines: dayLines,
      ...compare(declared.get(date) ?? emptyDeclared(), dayLines),
    });
  }

  return reports.sort((a, b) => {
    if (a.hasGap !== b.hasGap) return a.hasGap ? -1 : 1;
    return a.date.localeCompare(b.date);
  });
}

// -----------------------------------------------------------------------------
// Semaines
// -----------------------------------------------------------------------------

/**
 * Confronte chaque total hebdomadaire annoncé aux lignes qu'il couvre.
 *
 * Pas redondant avec les contrôles journaliers, et c'est contre-intuitif : sur
 * un carnet réel, les SEPT totaux journaliers d'une semaine tombaient juste un
 * par un, mais leur somme faisait 22 050 quand la ligne « Total hebdomadaire
 * S4 » en annonçait 24 050. L'erreur d'addition ne vit qu'à l'étage de la
 * semaine — aucun contrôle journalier ne pouvait la voir.
 */
export function buildWeekReports(
  lines: EditableLine[],
  checkpoints: ImportCheckpoint[],
): WeekReport[] {
  const bounds = new Map<string, { label: string; from: string; to: string }>();
  const declared = new Map<string, Declared>();

  for (const c of checkpoints) {
    if (c.scope !== "week" || !c.from || !c.to) continue;
    const key = `${c.from}|${c.to}`;
    if (!bounds.has(key)) {
      bounds.set(key, { label: c.label, from: c.from, to: c.to });
      declared.set(key, emptyDeclared());
    }
    declared.get(key)![c.direction] = c.declared;
  }

  const reports: WeekReport[] = [];
  for (const [key, b] of bounds) {
    const inWeek = lines.filter((l) => l.date >= b.from && l.date <= b.to);
    reports.push({ ...b, ...compare(declared.get(key)!, inWeek) });
  }

  return reports.sort((a, b) => {
    if (a.hasGap !== b.hasGap) return a.hasGap ? -1 : 1;
    return a.from.localeCompare(b.from);
  });
}

// -----------------------------------------------------------------------------
// Verdict d'ensemble
// -----------------------------------------------------------------------------

export interface NotebookVerdict {
  /** D'où vient le total revendiqué par le carnet. */
  source: "period" | "weeks";
  /** Ce qui est comparé : l'ensemble des lignes, ou les seules sorties. */
  measure: "gross" | "expense";
  declared: number;
  computed: number;
  gap: number;
  ok: boolean;
}

/**
 * « Ton carnet annonce X, tes lignes font Y. »
 *
 * Beaucoup de carnets n'écrivent aucun total mensuel — celui qui a révélé le
 * problème n'en avait pas. Son propriétaire obtenait son total en additionnant
 * ses cinq totaux hebdomadaires, et c'est ce chiffre-là qu'il compare à
 * l'application. On refait donc le même calcul que lui.
 *
 * Les semaines ne sont sommées que si elles ne se chevauchent pas : deux
 * périodes qui se recouvrent compteraient deux fois les mêmes lignes et
 * fabriqueraient un écart qui n'existe pas.
 */
export function buildVerdict(
  lines: EditableLine[],
  checkpoints: ImportCheckpoint[],
): NotebookVerdict | null {
  const period = declaredPeriod(checkpoints);

  if (period.gross !== null) {
    return verdict("period", "gross", period.gross, total(lines, "gross"));
  }
  if (period.expense !== null) {
    return verdict("period", "expense", period.expense, total(lines, "expense"));
  }

  const weeks = buildWeekReports(lines, checkpoints);
  if (weeks.length === 0) return null;

  const sorted = [...weeks].sort((a, b) => a.from.localeCompare(b.from));
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].from <= sorted[i - 1].to) return null; // chevauchement
  }

  // On ne somme que si TOUTES les semaines portent la même mesure : mélanger
  // un total brut et un total de sorties donnerait un chiffre qui ne veut rien
  // dire.
  for (const measure of ["gross", "expense"] as const) {
    if (sorted.every((w) => w.declared[measure] !== null)) {
      const declared = round(
        sorted.reduce((acc, w) => acc + (w.declared[measure] ?? 0), 0),
      );
      return verdict("weeks", measure, declared, total(lines, measure));
    }
  }
  return null;
}

// -----------------------------------------------------------------------------
// Catégories
// -----------------------------------------------------------------------------

export interface CategoryGroup {
  name: string;
  direction: "income" | "expense";
  count: number;
  total: number;
}

/**
 * Regroupe par catégorie, du plus gros montant au plus petit.
 *
 * Sert la correction la plus rentable de l'écran : sur un carnet réel, une
 * seule catégorie mal devinée peut concentrer des dizaines de lignes. La
 * réaffecter en bloc coûte un clic, ligne par ligne en coûterait vingt.
 */
export function groupByCategory(lines: EditableLine[]): CategoryGroup[] {
  const map = new Map<string, CategoryGroup>();
  for (const line of lines) {
    const name = line.category?.trim() || "(sans catégorie)";
    const key = `${line.direction}:${name}`;
    const g = map.get(key);
    if (g) {
      g.count += 1;
      g.total = round(g.total + line.amount);
    } else {
      map.set(key, {
        name,
        direction: line.direction,
        count: 1,
        total: line.amount,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function totalsOf(lines: ImportLine[]): {
  income: number;
  expense: number;
} {
  return { income: total(lines, "income"), expense: total(lines, "expense") };
}

// -----------------------------------------------------------------------------
// Internes
// -----------------------------------------------------------------------------

function emptyDeclared(): Declared {
  return { gross: null, income: null, expense: null };
}

/** Confronte un jeu de totaux annoncés à un sous-ensemble de lignes. */
function compare(declared: Declared, subset: ImportLine[]): Comparison {
  const computedGross = total(subset, "gross");
  const computedIncome = total(subset, "income");
  const computedExpense = total(subset, "expense");

  const grossGap = gapOf(declared.gross, computedGross);
  const incomeGap = gapOf(declared.income, computedIncome);
  const expenseGap = gapOf(declared.expense, computedExpense);

  return {
    declared,
    computedGross,
    computedIncome,
    computedExpense,
    grossGap,
    incomeGap,
    expenseGap,
    verifiable:
      declared.gross !== null ||
      declared.income !== null ||
      declared.expense !== null,
    hasGap: [grossGap, incomeGap, expenseGap].some(
      (g) => g !== null && Math.abs(g) > TOLERANCE,
    ),
  };
}

function verdict(
  source: NotebookVerdict["source"],
  measure: NotebookVerdict["measure"],
  declared: number,
  computed: number,
): NotebookVerdict {
  const gap = round(declared - computed);
  return {
    source,
    measure,
    declared,
    computed,
    gap,
    ok: Math.abs(gap) <= TOLERANCE,
  };
}

function gapOf(declared: number | null, computed: number): number | null {
  return declared === null ? null : round(declared - computed);
}

function total(
  lines: ImportLine[],
  measure: "income" | "expense" | "gross",
): number {
  return round(
    lines.reduce(
      (acc, l) =>
        measure === "gross" || l.direction === measure ? acc + l.amount : acc,
      0,
    ),
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
