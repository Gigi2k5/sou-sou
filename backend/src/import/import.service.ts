import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TxType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import type { AnalyzeImportDto } from './dto/analyze-import.dto';
import {
  type CommitImportDto,
  MAX_IMPORT_LINES,
  MAX_LINE_AMOUNT,
} from './dto/commit-import.dto';
import { GeminiService } from './gemini.service';
import type {
  AnalysisReport,
  Checkpoint,
  ExtractedLine,
  ExtractionResult,
  Measure,
} from './import.types';
import type { DeclaredWeeklyTotal } from './import.types';

/** Tolérance sur les contrôles de totaux. Les montants sont entiers en FCFA. */
const CHECK_TOLERANCE = 0.5;

/** Bornes de plausibilité des dates importées. */
const MIN_YEAR = 2000;

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gemini: GeminiService,
  ) {}

  // ---------------------------------------------------------------------------
  // ANALYSE — aucune écriture. L'utilisateur doit pouvoir relire avant de subir.
  // ---------------------------------------------------------------------------

  async analyze(
    userId: string,
    dto: AnalyzeImportDto,
  ): Promise<AnalysisReport> {
    const [user, categories, sources] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: { currency: true },
      }),
      this.prisma.expenseCategory.findMany({
        where: { userId },
        select: { name: true },
      }),
      this.prisma.incomeSource.findMany({
        where: { userId },
        select: { name: true },
      }),
    ]);

    const knownCategories = categories.map((c) => c.name);
    const knownSources = sources.map((s) => s.name);

    const raw = await this.gemini.extract(dto.text, {
      expenseCategories: knownCategories,
      incomeSources: knownSources,
      currency: user.currency,
      dateFormat: dto.dateFormat,
    });

    const warnings: string[] = [];
    const lines = this.sanitizeLines(raw.lines, warnings);

    if (lines.length === 0) {
      warnings.push(
        "Aucune transaction exploitable n'a été trouvée dans ce texte.",
      );
    }
    if (lines.length > MAX_IMPORT_LINES) {
      warnings.push(
        `${lines.length} lignes détectées, au-delà de la limite de ${MAX_IMPORT_LINES}. Découpe ton texte par mois.`,
      );
    }

    const income = sum(lines.filter((l) => l.direction === 'income'));
    const expense = sum(lines.filter((l) => l.direction === 'expense'));

    // Le cas « dépenses seules » n'est pas une anomalie : beaucoup de carnets
    // ne notent que les sorties. Mais importer ça tel quel afficherait un solde
    // catastrophiquement négatif, donc on le signale explicitement.
    if (lines.length > 0 && income === 0) {
      warnings.push('ONLY_EXPENSES');
    }

    const checkpoints = this.buildCheckpoints(raw, lines);
    const passed = checkpoints.filter((c) => c.ok).length;
    if (checkpoints.length > 0 && passed < checkpoints.length) {
      warnings.push(
        `${checkpoints.length - passed} total(aux) du document ne correspondent pas à ce qui a été extrait.`,
      );
    }

    return {
      periodLabel: raw.periodLabel?.trim() || null,
      lines,
      totals: {
        income,
        expense,
        declaredIncome: finiteOrNull(raw.declaredPeriodTotals?.income),
        declaredExpense: finiteOrNull(raw.declaredPeriodTotals?.expense),
      },
      checkpoints,
      checkSummary: { passed, total: checkpoints.length },
      // Un contrôle porte sur un sens précis → le document sépare les deux.
      // Uniquement des contrôles bruts → il ne les sépare pas.
      directionsVerifiable: checkpoints.some((c) => c.direction !== 'gross'),
      categories: split(
        lines.filter((l) => l.direction === 'expense'),
        knownCategories,
      ),
      incomeSources: split(
        lines.filter((l) => l.direction === 'income'),
        knownSources,
      ),
      warnings,
    };
  }

  /**
   * Filtre ce que le modèle a renvoyé.
   *
   * Tout ce qui sort du LLM est traité comme une saisie hostile : une date
   * illisible, un montant négatif ou un libellé vide sont écartés plutôt que
   * corrigés en silence, et l'utilisateur est prévenu du nombre de rejets.
   */
  private sanitizeLines(
    raw: ExtractedLine[],
    warnings: string[],
  ): ExtractedLine[] {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);

    let rejected = 0;
    const clean: ExtractedLine[] = [];

    for (const line of raw) {
      const date = parseIsoDate(line?.date);
      const amount = Number(line?.amount);
      const label = typeof line?.label === 'string' ? line.label.trim() : '';

      const valid =
        date !== null &&
        date.getFullYear() >= MIN_YEAR &&
        date <= maxDate &&
        Number.isFinite(amount) &&
        amount > 0 &&
        amount <= MAX_LINE_AMOUNT &&
        label.length > 0 &&
        (line.direction === 'income' || line.direction === 'expense');

      if (!valid) {
        rejected += 1;
        continue;
      }

      clean.push({
        date: date.toISOString().slice(0, 10),
        label: label.slice(0, 280),
        amount: Math.round(amount * 100) / 100,
        direction: line.direction,
        category:
          typeof line.category === 'string' && line.category.trim()
            ? line.category.trim().slice(0, 60)
            : undefined,
        confidence: clampConfidence(line.confidence),
      });
    }

    if (rejected > 0) {
      warnings.push(
        `${rejected} ligne(s) illisible(s) ont été écartées (date, montant ou libellé invalide).`,
      );
    }
    return clean;
  }

  /**
   * Confronte les totaux ANNONCÉS par le document à ceux calculés.
   *
   * C'est le seul contrôle objectif dont on dispose : un total journalier qui
   * tombe juste prouve qu'aucune ligne du jour n'a été oubliée, inventée, ni
   * rangée du mauvais côté. Un carnet qui porte ses totaux se vérifie tout seul.
   */
  private buildCheckpoints(
    raw: ExtractionResult,
    lines: ExtractedLine[],
  ): Checkpoint[] {
    const checks: Checkpoint[] = [];

    const push = (
      scope: Checkpoint['scope'],
      label: string,
      measure: Measure,
      declared: number | null,
      computed: number,
      bounds?: { from: string; to: string },
    ) => {
      if (declared === null) return;
      checks.push({
        scope,
        label,
        direction: measure,
        declared,
        computed,
        ok: Math.abs(declared - computed) <= CHECK_TOLERANCE,
        ...bounds,
      });
    };

    /**
     * Confronte un sous-ensemble de lignes aux totaux annoncés pour lui.
     *
     * `gross` est le cas dominant — un carnet écrit « Total = 32000 » sans rien
     * distinguer. On le compare alors à la somme de TOUTES les lignes, quel que
     * soit leur sens. C'est ce qui rend la référence immobile : que
     * l'utilisateur rebascule une ligne d'entrée en sortie ne change pas le
     * total du jour, donc ne fabrique pas d'écart imaginaire.
     */
    const compare = (
      scope: Checkpoint['scope'],
      label: string,
      declared: { gross?: number; income?: number; expense?: number },
      subset: ExtractedLine[],
      bounds?: { from: string; to: string },
    ) => {
      const gross = finiteOrNull(declared.gross);
      if (gross !== null) {
        push(scope, label, 'gross', gross, sum(subset), bounds);
        return;
      }
      push(
        scope,
        label,
        'expense',
        finiteOrNull(declared.expense),
        sum(subset.filter((l) => l.direction === 'expense')),
        bounds,
      );
      push(
        scope,
        label,
        'income',
        finiteOrNull(declared.income),
        sum(subset.filter((l) => l.direction === 'income')),
        bounds,
      );
    };

    // --- Journées ---
    for (const daily of raw.declaredDailyTotals ?? []) {
      const date = parseIsoDate(daily?.date);
      if (!date) continue;
      const key = date.toISOString().slice(0, 10);
      compare(
        'day',
        key,
        daily,
        lines.filter((l) => l.date === key),
      );
    }

    // --- Semaines ---
    // Pas redondantes avec les journées, et c'est contre-intuitif : sur un
    // carnet réel, les sept totaux journaliers d'une semaine tombaient juste un
    // par un, mais leur somme faisait 22 050 quand la ligne « Total
    // hebdomadaire S4 » en annonçait 24 050. L'erreur d'addition ne vit qu'à
    // l'étage de la semaine — aucun contrôle journalier ne pouvait la voir.
    for (const week of resolveWeeks(raw.declaredWeeklyTotals, lines)) {
      compare(
        'week',
        week.label,
        week.declared,
        lines.filter((l) => l.date >= week.from && l.date <= week.to),
        { from: week.from, to: week.to },
      );
    }

    // --- Période entière ---
    compare('period', 'Total période', raw.declaredPeriodTotals ?? {}, lines);

    return checks;
  }

  // ---------------------------------------------------------------------------
  // ÉCRITURE — on n'écrit que ce que l'utilisateur a relu et validé.
  // ---------------------------------------------------------------------------

  /**
   * Écrit les lignes validées dans un lot annulable.
   *
   * Les crochets de gamification ne sont volontairement PAS déclenchés : on
   * écrit via Prisma et non via TransactionsService. Importer trois mois
   * d'historique ne doit pas offrir une série de 90 jours ni une avalanche de
   * points — la récompense doit rester liée à l'usage réel.
   */
  async commit(userId: string, dto: CommitImportDto) {
    const lines = dto.lines;

    const expenseNames = distinct(
      lines.filter((l) => l.direction === 'expense').map((l) => l.category),
    );
    const incomeNames = distinct(
      lines.filter((l) => l.direction === 'income').map((l) => l.category),
    );

    const importedExpenseTotal = sum(
      lines.filter((l) => l.direction === 'expense'),
    );
    const importedIncomeTotal = sum(
      lines.filter((l) => l.direction === 'income'),
    );

    return this.prisma.$transaction(async (tx) => {
      const categoryIds = new Map<string, string>();
      for (const name of expenseNames) {
        const cat = await tx.expenseCategory.upsert({
          where: { userId_name: { userId, name } },
          update: {},
          create: { userId, name, kind: 'FREE' },
          select: { id: true },
        });
        categoryIds.set(name, cat.id);
      }

      const sourceIds = new Map<string, string>();
      for (const name of incomeNames) {
        const src = await tx.incomeSource.upsert({
          where: { userId_name: { userId, name } },
          update: {},
          create: { userId, name },
          select: { id: true },
        });
        sourceIds.set(name, src.id);
      }

      const batch = await tx.importBatch.create({
        data: {
          userId,
          source: 'TEXT',
          periodLabel: dto.periodLabel ?? null,
          lineCount: lines.length,
          importedIncomeTotal,
          importedExpenseTotal,
          declaredIncomeTotal: dto.declaredIncomeTotal ?? null,
          declaredExpenseTotal: dto.declaredExpenseTotal ?? null,
        },
      });

      await tx.transaction.createMany({
        data: lines.map((l) => ({
          userId,
          type: l.direction === 'income' ? TxType.INCOME : TxType.EXPENSE,
          amount: l.amount,
          // Midi UTC : une date d'historique n'a pas d'heure, et se caler à
          // midi évite qu'un décalage de fuseau la fasse basculer la veille.
          date: new Date(`${l.date}T12:00:00.000Z`),
          note: l.label,
          expenseCategoryId:
            l.direction === 'expense' && l.category
              ? (categoryIds.get(l.category) ?? null)
              : null,
          incomeSourceId:
            l.direction === 'income' && l.category
              ? (sourceIds.get(l.category) ?? null)
              : null,
          importBatchId: batch.id,
        })),
      });

      this.logger.log(
        `Import ${batch.id} — ${lines.length} transactions pour l'utilisateur ${userId}`,
      );

      return {
        batchId: batch.id,
        lineCount: lines.length,
        importedIncomeTotal,
        importedExpenseTotal,
        createdCategories: expenseNames.length,
        createdIncomeSources: incomeNames.length,
      };
    });
  }

  /** Historique des imports — alimente le bouton « annuler ». */
  async listBatches(userId: string) {
    return this.prisma.importBatch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  /**
   * Annule un import en bloc.
   *
   * Les transactions sont supprimées AVANT le lot : la relation est en
   * `SetNull`, donc supprimer le lot d'abord les détacherait au lieu de les
   * effacer — elles resteraient orphelines et invisibles.
   */
  async undo(userId: string, batchId: string) {
    const batch = await this.prisma.importBatch.findFirst({
      where: { id: batchId, userId },
      select: { id: true },
    });
    if (!batch) {
      throw new NotFoundException('Import introuvable.');
    }

    const [deleted] = await this.prisma.$transaction([
      this.prisma.transaction.deleteMany({
        where: { importBatchId: batchId, userId },
      }),
      this.prisma.importBatch.delete({ where: { id: batchId } }),
    ]);

    this.logger.log(
      `Import ${batchId} annulé — ${deleted.count} transactions supprimées`,
    );
    return { deletedCount: deleted.count };
  }
}

// -----------------------------------------------------------------------------
// Utilitaires
// -----------------------------------------------------------------------------

/**
 * Fixe les bornes réelles de chaque total hebdomadaire.
 *
 * ⚠️ On ne fait PAS confiance à la date de début renvoyée par le modèle. Sur un
 * carnet réel, « Total hebdomadaire S2 » a été extrait comme couvrant le 08 au
 * 09 alors qu'il couvrait le 03 au 09 : cinq journées manquantes, un écart
 * fantôme de 14 700 F, et un carnet parfaitement juste accusé d'être faux.
 *
 * La raison est structurelle : dans ces carnets une semaine n'écrit jamais son
 * début. Elle est définie par sa POSITION — elle couvre tout ce qui va du total
 * hebdomadaire précédent jusqu'au sien. On déduit donc le début au lieu de le
 * demander. La date de fin, elle, est fiable : c'est le dernier jour écrit juste
 * avant la ligne de total.
 *
 * Si les fins ne sont pas strictement croissantes, on renonce à tous les
 * contrôles hebdomadaires : mieux vaut ne rien vérifier que désigner de faux
 * coupables.
 */
function resolveWeeks(
  declared: DeclaredWeeklyTotal[] | undefined,
  lines: ExtractedLine[],
): {
  label: string;
  from: string;
  to: string;
  declared: { gross?: number; income?: number; expense?: number };
}[] {
  if (!declared?.length || lines.length === 0) return [];

  const parsed = declared
    .map((w) => {
      const to = parseIsoDate(w?.to);
      return to ? { raw: w, to: to.toISOString().slice(0, 10) } : null;
    })
    .filter((w): w is { raw: DeclaredWeeklyTotal; to: string } => w !== null)
    .sort((a, b) => a.to.localeCompare(b.to));

  if (parsed.length !== declared.length) return [];
  for (let i = 1; i < parsed.length; i += 1) {
    if (parsed[i].to <= parsed[i - 1].to) return [];
  }

  let cursor = lines.reduce(
    (min, l) => (l.date < min ? l.date : min),
    lines[0].date,
  );

  return parsed.map(({ raw, to }, i) => {
    const from = cursor;
    cursor = nextDay(to);
    return {
      label: raw.label?.trim() || `Semaine ${i + 1}`,
      from,
      to,
      declared: { gross: raw.gross, income: raw.income, expense: raw.expense },
    };
  });
}

/** Lendemain d'une date ISO, en ISO. */
function nextDay(iso: string): string {
  const d = new Date(`${iso}T12:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

function sum(lines: { amount: number }[]): number {
  return Math.round(lines.reduce((acc, l) => acc + l.amount, 0) * 100) / 100;
}

function distinct(values: (string | undefined)[]): string[] {
  return [
    ...new Set(
      values
        .map((v) => v?.trim())
        .filter((v): v is string => typeof v === 'string' && v.length > 0),
    ),
  ];
}

function split(
  lines: ExtractedLine[],
  known: string[],
): { known: string[]; toCreate: string[] } {
  const used = distinct(lines.map((l) => l.category));
  const knownSet = new Set(known);
  return {
    known: used.filter((n) => knownSet.has(n)),
    toCreate: used.filter((n) => !knownSet.has(n)),
  };
}

function parseIsoDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(`${y}-${m}-${d}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  // Rejette les dates qui « débordent » (31/02 deviendrait le 03/03).
  if (date.getUTCDate() !== Number(d) || date.getUTCMonth() + 1 !== Number(m)) {
    return null;
  }
  return date;
}

function finiteOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function clampConfidence(value: unknown): number | undefined {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  return Math.min(1, Math.max(0, n));
}
