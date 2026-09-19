import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Export des données d'un compte.
 *
 * Le pendant de l'import, et le préalable à toute promesse de confidentialité :
 * on ne fait confiance qu'à ce qu'on peut quitter. Une application où l'on peut
 * tout mettre et rien reprendre n'est pas un outil, c'est un piège.
 *
 * Deux formats, pour deux usages qui n'ont rien à voir :
 *   - CSV, qui s'ouvre dans un tableur. C'est celui que les gens utiliseront
 *     réellement, et c'est le miroir exact de l'import : ce qui entre par un
 *     fichier Excel ressort en fichier Excel.
 *   - JSON, qui contient TOUT, y compris ce qu'un tableau ne sait pas
 *     représenter. C'est celui qui rend la promesse vraie.
 */
@Injectable()
export class AccountExportService {
  constructor(private readonly prisma: PrismaService) {}

  /** Copie intégrale, destinée au JSON. */
  async collect(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        currency: true,
        role: true,
        totalPoints: true,
        currentStreak: true,
        bestStreak: true,
        createdAt: true,
        lastLoginAt: true,
        emailVerified: true,
      },
    });
    if (!user) throw new NotFoundException('Utilisateur introuvable.');

    const [
      transactions,
      expenseCategories,
      incomeSources,
      budgets,
      savingsGoal,
      ownedMoneyPots,
      memberships,
      recurring,
      importBatches,
      badges,
      articles,
      comments,
    ] = await Promise.all([
      this.prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'asc' },
        select: {
          date: true,
          type: true,
          amount: true,
          note: true,
          createdAt: true,
          expenseCategory: { select: { name: true } },
          incomeSource: { select: { name: true } },
        },
      }),
      this.prisma.expenseCategory.findMany({
        where: { userId },
        select: { name: true, kind: true, createdAt: true },
      }),
      this.prisma.incomeSource.findMany({
        where: { userId },
        select: { name: true, createdAt: true },
      }),
      this.prisma.budget.findMany({
        where: { userId },
        select: {
          monthlyLimit: true,
          alertThreshold: true,
          category: { select: { name: true } },
        },
      }),
      this.prisma.savingsGoal.findUnique({
        where: { userId },
        select: {
          name: true,
          targetAmount: true,
          dailyAmount: true,
          deadline: true,
          isCompleted: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      this.prisma.moneyPot.findMany({
        where: { ownerId: userId },
        select: {
          name: true,
          description: true,
          targetAmount: true,
          deadline: true,
          isGroup: true,
          isCompleted: true,
          createdAt: true,
          _count: { select: { members: true } },
        },
      }),
      this.prisma.moneyPotMember.findMany({
        where: { userId },
        select: {
          joinedAt: true,
          moneyPot: { select: { name: true, isGroup: true } },
        },
      }),
      this.prisma.recurringTransaction.findMany({
        where: { userId },
        select: {
          type: true,
          amount: true,
          dayOfMonth: true,
          note: true,
          isActive: true,
          createdAt: true,
        },
      }),
      this.prisma.importBatch.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        select: {
          source: true,
          periodLabel: true,
          lineCount: true,
          importedIncomeTotal: true,
          importedExpenseTotal: true,
          createdAt: true,
        },
      }),
      this.prisma.userBadge.findMany({
        where: { userId },
        select: { unlockedAt: true, badge: { select: { name: true } } },
      }),
      this.prisma.article.findMany({
        where: { authorId: userId },
        // Le contenu est inclus : ce sont les mots de la personne, ils lui
        // appartiennent autant que ses chiffres.
        select: {
          title: true,
          slug: true,
          excerpt: true,
          content: true,
          isHidden: true,
          createdAt: true,
        },
      }),
      this.prisma.articleComment.findMany({
        where: { authorId: userId },
        select: {
          body: true,
          createdAt: true,
          article: { select: { title: true } },
        },
      }),
    ]);

    return {
      // Un en-tête qui explique le fichier à qui l'ouvrira dans six mois.
      aPropos: {
        genere: new Date().toISOString(),
        application: "Sou'Sou",
        contenu:
          'Copie intégrale des données rattachées à ce compte, à la date indiquée ci-dessus.',
      },
      profil: user,
      transactions: transactions.map((t) => ({
        date: t.date,
        sens: t.type === 'INCOME' ? 'entrée' : 'sortie',
        montant: t.amount,
        categorie: t.expenseCategory?.name ?? t.incomeSource?.name ?? null,
        note: t.note,
        saisieLe: t.createdAt,
      })),
      categoriesDeDepense: expenseCategories,
      sourcesDeRevenu: incomeSources,
      budgets,
      objectifEpargne: savingsGoal,
      cotisationsCreees: ownedMoneyPots,
      cotisationsRejointes: memberships,
      transactionsRecurrentes: recurring,
      imports: importBatches,
      badges,
      articles,
      commentaires: comments,
    };
  }

  /**
   * Les transactions en CSV.
   *
   * Séparateur point-virgule et BOM UTF-8 : sans les deux, Excel en configuration
   * française affiche tout dans une seule colonne et massacre les accents. C'est
   * le format que ce public ouvrira, autant qu'il s'ouvre correctement.
   */
  async toCsv(userId: string): Promise<string> {
    const rows = await this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        type: true,
        amount: true,
        note: true,
        expenseCategory: { select: { name: true } },
        incomeSource: { select: { name: true } },
      },
    });

    const header = ['Date', 'Sens', 'Montant', 'Catégorie', 'Note'];
    const lines = rows.map((t) =>
      [
        t.date.toISOString().slice(0, 10),
        t.type === 'INCOME' ? 'Entrée' : 'Sortie',
        String(t.amount),
        t.expenseCategory?.name ?? t.incomeSource?.name ?? '',
        t.note ?? '',
      ]
        .map(escapeCsv)
        .join(';'),
    );

    // `\uFEFF` = BOM UTF-8, en échappement plutôt qu'en caractère littéral :
    // invisible dans l'éditeur, il serait supprimé au premier reformatage.
    return `\uFEFF${header.join(';')}\n${lines.join('\n')}\n`;
  }
}

/**
 * Échappe une cellule CSV.
 *
 * Le préfixe sur `= + - @` neutralise l'injection de formule : une note qui
 * commencerait par `=` serait exécutée comme une formule à l'ouverture du
 * tableur. C'est un vrai vecteur d'attaque, et il vise ici le fichier que
 * l'utilisateur télécharge pour se rassurer.
 */
function escapeCsv(value: string): string {
  const risky = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[";\n\r]/.test(risky) ? `"${risky.replace(/"/g, '""')}"` : risky;
}
