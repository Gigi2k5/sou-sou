import type {
  EditableLine,
  ImportCheckpoint,
  ImportLine,
} from "@/types/import";

/** Totaux annoncés par le document pour une journée. */
export interface DeclaredDay {
  income: number | null;
  expense: number | null;
}

export interface DayReport {
  /** ISO `YYYY-MM-DD`. */
  date: string;
  lines: EditableLine[];
  declaredIncome: number | null;
  declaredExpense: number | null;
  computedIncome: number;
  computedExpense: number;
  /** `déclaré - calculé`. null quand le document n'annonce rien pour ce jour. */
  incomeGap: number | null;
  expenseGap: number | null;
  /** Le document porte au moins un total pour ce jour → vérifiable. */
  verifiable: boolean;
  /** Vérifiable ET au moins un écart. */
  hasGap: boolean;
}

/** Les montants sont entiers en FCFA : au-delà d'un demi-franc, c'est un écart. */
const TOLERANCE = 0.5;

/**
 * Extrait les totaux journaliers annoncés depuis les contrôles du serveur.
 *
 * On ne garde que le `declared` : le `computed` renvoyé par l'API devient
 * caduc dès la première correction de l'utilisateur. C'est tout l'intérêt de
 * recalculer côté client — l'écart se résorbe sous ses yeux pendant qu'il
 * corrige, au lieu d'attendre un aller-retour serveur.
 */
export function declaredByDay(
  checkpoints: ImportCheckpoint[],
): Map<string, DeclaredDay> {
  const map = new Map<string, DeclaredDay>();
  for (const c of checkpoints) {
    if (c.scope !== "day") continue;
    const entry = map.get(c.label) ?? { income: null, expense: null };
    entry[c.direction] = c.declared;
    map.set(c.label, entry);
  }
  return map;
}

/** Totaux de période annoncés, s'ils existent. */
export function declaredPeriod(checkpoints: ImportCheckpoint[]): DeclaredDay {
  const out: DeclaredDay = { income: null, expense: null };
  for (const c of checkpoints) {
    if (c.scope === "period") out[c.direction] = c.declared;
  }
  return out;
}

/**
 * Regroupe les lignes par jour et confronte chaque journée à ses totaux annoncés.
 *
 * L'ordre de sortie porte toute l'intention de l'écran de revue : les journées
 * EN ÉCART d'abord. Personne ne relit 98 lignes — mais tout le monde relit la
 * seule journée dont l'addition ne tombe pas juste.
 *
 * Ce tri remplace celui par « confiance » du modèle, mesuré inutilisable : sur
 * un carnet réel il renvoie 1 partout, y compris sur la ligne qu'il a mal
 * classée. Le carnet, lui, ne se trompe pas d'addition.
 */
export function buildDayReports(
  lines: EditableLine[],
  declared: Map<string, DeclaredDay>,
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
    const d = declared.get(date) ?? { income: null, expense: null };
    const computedIncome = total(dayLines, "income");
    const computedExpense = total(dayLines, "expense");
    const incomeGap = d.income === null ? null : round(d.income - computedIncome);
    const expenseGap =
      d.expense === null ? null : round(d.expense - computedExpense);
    const verifiable = d.income !== null || d.expense !== null;

    reports.push({
      date,
      lines: dayLines,
      declaredIncome: d.income,
      declaredExpense: d.expense,
      computedIncome,
      computedExpense,
      incomeGap,
      expenseGap,
      verifiable,
      hasGap:
        verifiable &&
        (Math.abs(incomeGap ?? 0) > TOLERANCE ||
          Math.abs(expenseGap ?? 0) > TOLERANCE),
    });
  }

  return reports.sort((a, b) => {
    if (a.hasGap !== b.hasGap) return a.hasGap ? -1 : 1;
    return a.date.localeCompare(b.date);
  });
}

/** Totaux par catégorie — alimente la réaffectation en masse. */
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

function total(lines: ImportLine[], direction: "income" | "expense"): number {
  return round(
    lines.reduce((acc, l) => (l.direction === direction ? acc + l.amount : acc), 0),
  );
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
