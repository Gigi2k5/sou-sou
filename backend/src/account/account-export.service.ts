import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Export des données d'un compte.
 *
 * Le pendant de l'import, et le préalable à toute promesse de confidentialité :
 * on ne fait confiance qu'à ce qu'on peut quitter. Une application où l'on peut
 * tout mettre et rien reprendre n'est pas un outil, c'est un piège.
 *
 * Ce service ne produit QUE du JSON, et c'est volontaire : le classeur Excel
 * est construit dans le navigateur, à partir de cette même réponse, avec la
 * bibliothèque déjà embarquée pour l'import de tableurs. Deux avantages — aucune
 * dépendance de mise en forme côté serveur, et surtout la certitude que les deux
 * formats décrivent exactement les mêmes données, puisqu'ils sortent d'ici.
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
}
