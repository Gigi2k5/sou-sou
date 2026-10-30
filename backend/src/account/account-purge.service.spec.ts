import { ConflictException } from '@nestjs/common';

// Le drapeau est remplacé par un objet MUTABLE : les cotisations sont masquées
// aujourd'hui, mais le garde doit rester testé pour le jour où elles
// reviendront. Un test qui disparaît avec une fonctionnalité masquée, c'est une
// régression qui attend sagement son heure.
jest.mock('../config/features', () => ({ FEATURES: { cotisations: true } }));
import { Prisma } from '@prisma/client';

import { FEATURES } from '../config/features';
import { AccountPurgeService } from './account-purge.service';

/**
 * Le défaut que ces tests gardent fermé : une table du schéma oubliée dans la
 * purge. C'est arrivé pour de vrai — `recurringTransaction` et `importBatch`
 * survivaient à une « suppression de compte », avec leurs libellés et leurs
 * montants, parce que la ligne `User` n'est pas détruite et que RIEN ne cascade
 * sur un effacement logique.
 *
 * Le garde-fou décisif est le dernier test : il interroge le schéma Prisma
 * lui-même et exige que CHAQUE modèle relié à `User` soit classé, soit comme
 * purgé, soit comme conservé pour une raison écrite. Ajouter une table au
 * schéma sans trancher son sort casse la suite — ce qui est précisément le
 * rappel qui a manqué.
 */

/**
 * Ce qui est conservé, et pourquoi. Aucune de ces lignes ne permet de remonter
 * à une personne une fois son compte anonymisé : elles pointent toutes vers
 * « Compte supprimé ».
 */
const KEPT_ON_PURPOSE: Record<string, string> = {
  Article: 'contenu public : le supprimer casserait les liens et les fils',
  ArticleComment: 'contenu public, dans des discussions à plusieurs',
  ArticleLike: 'simple compteur, rattaché à « Compte supprimé »',
  MoneyPotMember:
    "participation aux cotisations d'AUTRES personnes : la retirer fausserait leur cagnotte",
  Report: 'trace de modération ; le signalant est détaché (reporterId = null)',
  AdminLog: "journal d'audit des actions d'administration",
  Broadcast: "message envoyé à tous, rédigé en tant qu'administrateur",
  Resource: "contenu du site ajouté en tant qu'administrateur",
};

const PERSONAL_TABLES = [
  'moneyPot',
  'savingsGoal',
  'recurringTransaction',
  'expenseCategory',
  'incomeSource',
  'transaction',
  'importBatch',
  'budget',
  'avatarUnlock',
  'userBadge',
  'notification',
  'refreshToken',
];

function makeTx() {
  const calls: string[] = [];
  const tx: Record<string, unknown> = {};

  for (const table of PERSONAL_TABLES) {
    tx[table] = {
      deleteMany: jest.fn(() => {
        calls.push(table);
        return Promise.resolve({ count: 0 });
      }),
    };
  }
  tx.report = { updateMany: jest.fn(() => Promise.resolve({ count: 0 })) };
  tx.user = { update: jest.fn(() => Promise.resolve({})) };

  return { tx, calls };
}

describe('AccountPurgeService', () => {
  describe('purge', () => {
    it('efface toutes les tables personnelles, sans en oublier une', async () => {
      const service = new AccountPurgeService({} as never);
      const { tx, calls } = makeTx();

      await service.purge(tx as never, 'user-1', 'user-1');

      for (const table of PERSONAL_TABLES) {
        expect(calls).toContain(table);
      }
      expect(calls).toHaveLength(PERSONAL_TABLES.length);
    });

    it('supprime les règles récurrentes AVANT les catégories', async () => {
      // Leur lien vers la catégorie est en `SetNull` : supprimer la catégorie
      // d'abord ne les emporte pas, elle les détache. L'ordre n'est pas une
      // préférence de style, c'est ce qui fait la différence entre une règle
      // effacée et une règle orpheline qui reste en base.
      const service = new AccountPurgeService({} as never);
      const { tx, calls } = makeTx();

      await service.purge(tx as never, 'user-1', 'user-1');

      expect(calls.indexOf('recurringTransaction')).toBeLessThan(
        calls.indexOf('expenseCategory'),
      );
    });

    it('anonymise la ligne user au lieu de la détruire', async () => {
      const service = new AccountPurgeService({} as never);
      const { tx } = makeTx();

      await service.purge(tx as never, 'user-1', 'admin-9');

      const update = (tx.user as { update: jest.Mock }).update;
      expect(update).toHaveBeenCalledTimes(1);
      const firstCall = update.mock.calls[0] as [
        { data: Record<string, unknown> },
      ];
      const { data } = firstCall[0];
      expect(data.email).toBe('deleted-user-1@anonymized.local');
      expect(data.name).toBe('Compte supprimé');
      expect(data.password).toBe('');
      expect(data.isBanned).toBe(true);
      expect(data.bannedBy).toBe('admin-9');
      // Les jetons de réinitialisation et de vérification doivent partir aussi :
      // un compte anonymisé ne doit pas rester récupérable par un lien reçu la
      // veille par courriel.
      expect(data.resetToken).toBeNull();
      expect(data.verificationCodeHash).toBeNull();
    });
  });

  describe('couverture du schéma', () => {
    it('classe chaque modèle relié à User : purgé, ou conservé avec un motif', () => {
      const related = Prisma.dmmf.datamodel.models
        .filter((m) =>
          m.fields.some((f) => f.type === 'User' && f.kind === 'object'),
        )
        .map((m) => m.name);

      // `User` lui-même est anonymisé, pas supprimé : il n'entre dans aucune
      // des deux listes.
      const purged = new Set(
        PERSONAL_TABLES.map((t) => t[0].toUpperCase() + t.slice(1)),
      );

      const unclassified = related.filter(
        (name) => !purged.has(name) && KEPT_ON_PURPOSE[name] === undefined,
      );

      expect(unclassified).toEqual([]);
    });
  });

  describe('assertDeletable', () => {
    const withPots = (pots: Array<{ name: string; members: number }>) =>
      new AccountPurgeService({
        moneyPot: {
          findMany: jest.fn(() =>
            Promise.resolve(
              pots.map((p) => ({
                name: p.name,
                _count: { members: p.members },
              })),
            ),
          ),
        },
      } as never);

    it("laisse passer quand aucune cotisation de groupe n'est habitée", async () => {
      await expect(withPots([]).assertDeletable('u')).resolves.toBeUndefined();
    });

    it('laisse passer un pot de groupe où la personne est seule', async () => {
      // Un membre = le créateur lui-même. Personne d'autre ne perd rien.
      await expect(
        withPots([{ name: 'Tontine', members: 1 }]).assertDeletable('u'),
      ).resolves.toBeUndefined();
    });

    it("bloque et NOMME le pot quand d'autres y participent", async () => {
      const service = withPots([{ name: 'Tontine du quartier', members: 4 }]);

      await expect(service.assertDeletable('u')).rejects.toThrow(
        ConflictException,
      );
      // Le nom doit figurer dans le message : un refus qui ne dit pas quoi
      // faire laisse la personne bloquée sans recours.
      await expect(service.assertDeletable('u')).rejects.toThrow(
        /Tontine du quartier/,
      );
    });

    it('ne bloque JAMAIS tant que les cotisations sont masquées', async () => {
      // C'est l'état réel du produit aujourd'hui, et la raison d'être du
      // garde-fou : le message demande de terminer sa cotisation d'abord, or
      // l'écran qui le permet n'est plus accessible. Sans cette exception, la
      // personne ne pourrait ni gérer sa cotisation, ni supprimer son compte.
      const flags = FEATURES as unknown as { cotisations: boolean };
      flags.cotisations = false;
      try {
        await expect(
          withPots([
            { name: 'Tontine du quartier', members: 4 },
          ]).assertDeletable('u'),
        ).resolves.toBeUndefined();
      } finally {
        flags.cotisations = true;
      }
    });
  });
});
