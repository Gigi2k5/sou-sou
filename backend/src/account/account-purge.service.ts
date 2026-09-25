import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

/**
 * Effacement des données personnelles d'un compte.
 *
 * SOURCE UNIQUE, volontairement. La suppression pouvait être déclenchée par
 * l'administration ; elle peut maintenant l'être par l'utilisateur lui-même.
 * Deux implémentations de la même chose auraient divergé à la première table
 * ajoutée au schéma — et c'est exactement ce qui était déjà arrivé : les
 * transactions récurrentes et les lots d'import survivaient à la suppression,
 * avec leurs libellés et leurs montants.
 *
 * ON NE SUPPRIME PAS LA LIGNE `User`. Elle est vidée de tout ce qui identifie
 * la personne, puis bloquée. La raison est que d'autres personnes en dépendent :
 * un article publié, un commentaire dans un fil de discussion, une participation
 * à une cotisation de groupe. Les faire disparaître amputerait les données de
 * tiers, qui n'ont rien demandé. L'anonymisation atteint le même but — plus
 * personne ne peut relier ces traces à quelqu'un — sans ce dégât collatéral.
 */
@Injectable()
export class AccountPurgeService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Vérifie qu'un compte PEUT être supprimé.
   *
   * Un seul cas bloque : être créateur d'une cotisation de groupe encore active
   * où d'autres personnes ont mis de l'argent. Supprimer le compte détruirait
   * leur cagnotte. On refuse et on nomme le pot, pour que la personne sache quoi
   * faire — plutôt que de lui opposer un refus opaque.
   */
  async assertDeletable(userId: string): Promise<void> {
    const pots = await this.prisma.moneyPot.findMany({
      where: { ownerId: userId, isGroup: true, isCompleted: false },
      include: { _count: { select: { members: true } } },
    });
    const blocking = pots.filter((p) => p._count.members > 1);
    if (blocking.length === 0) return;

    const names = blocking.map((p) => `« ${p.name} »`).join(', ');
    throw new ConflictException(
      blocking.length === 1
        ? `Tu es le créateur de la cotisation de groupe ${names}, et d'autres personnes y participent. Termine-la ou supprime-la avant de supprimer ton compte.`
        : `Tu es le créateur de ${blocking.length} cotisations de groupe actives où d'autres personnes participent (${names}). Termine-les ou supprime-les avant de supprimer ton compte.`,
    );
  }

  /**
   * Efface tout ce qui appartient en propre à l'utilisateur, puis anonymise sa
   * ligne. À appeler DANS une transaction : la suppression doit être totale ou
   * nulle, jamais à moitié.
   *
   * `bannedBy` reçoit l'identifiant de l'administrateur quand la suppression
   * vient de l'administration, et celui de la personne elle-même quand elle
   * part d'elle-même — ce qui rend les deux cas distinguables après coup.
   */
  async purge(
    tx: Prisma.TransactionClient,
    userId: string,
    bannedBy: string,
  ): Promise<void> {
    // 1. Cotisations possédées : la cascade emporte les membres, les catégories
    //    de type POT, et détache les transactions liées.
    await tx.moneyPot.deleteMany({ where: { ownerId: userId } });

    // 2. Objectif d'épargne (cascade sa catégorie SAVINGS et ses transactions).
    await tx.savingsGoal.deleteMany({ where: { userId } });

    // 3. Règles de transactions récurrentes. AVANT les catégories : leurs liens
    //    sont en `SetNull`, donc elles survivraient à la suppression de la
    //    catégorie sans être elles-mêmes supprimées. C'est précisément l'oubli
    //    qui laissait « loyer chez tonton — 15 000 » en base après une
    //    suppression de compte.
    await tx.recurringTransaction.deleteMany({ where: { userId } });

    // 4. Catégories de dépense libres (cascade leurs transactions et budgets).
    await tx.expenseCategory.deleteMany({ where: { userId, kind: 'FREE' } });

    // 5. Sources de revenu (cascade les transactions d'entrée).
    await tx.incomeSource.deleteMany({ where: { userId } });

    // 6. Transactions devenues orphelines. On épargne celles rattachées à la
    //    catégorie d'un pot appartenant à QUELQU'UN D'AUTRE : les retirer
    //    amputerait la cagnotte des autres membres.
    await tx.transaction.deleteMany({
      where: { userId, expenseCategoryId: null, incomeSourceId: null },
    });

    // 7. Lots d'import. Oubliés eux aussi : ils portent la période couverte et
    //    les montants totaux de chaque import.
    await tx.importBatch.deleteMany({ where: { userId } });

    // 8. Ce qui n'intéresse personne d'autre.
    await tx.budget.deleteMany({ where: { userId } });
    await tx.avatarUnlock.deleteMany({ where: { userId } });
    await tx.userBadge.deleteMany({ where: { userId } });
    await tx.notification.deleteMany({ where: { userId } });
    await tx.refreshToken.deleteMany({ where: { userId } });

    // 9. Signalements émis : le fil de modération reste, son auteur disparaît.
    await tx.report.updateMany({
      where: { reporterId: userId },
      data: { reporterId: null },
    });

    // 10. Anonymisation. L'adresse est remplacée par une valeur unique et
    //     invalide : unique parce que la colonne l'exige, invalide pour qu'une
    //     erreur d'aiguillage n'envoie jamais rien à un domaine réel.
    await tx.user.update({
      where: { id: userId },
      data: {
        email: `deleted-${userId}@anonymized.local`,
        name: 'Compte supprimé',
        password: '',
        avatarUrl: null,
        totalPoints: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastContributionAt: null,
        lastLoginAt: null,
        isBanned: true,
        banReason: 'Compte supprimé',
        bannedAt: new Date(),
        bannedBy,
        resetToken: null,
        resetTokenExpiresAt: null,
        verificationCodeHash: null,
        verificationCodeExpiresAt: null,
      },
    });
  }

  /** Garde-fou partagé : le compte existe-t-il et n'est-il pas déjà supprimé ? */
  async loadLive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.email.startsWith('deleted-')) {
      throw new NotFoundException('Utilisateur introuvable.');
    }
    return user;
  }
}
