/**
 * Conditions de déblocage des 8 avatars (V2.5).
 *
 * Chaque entrée déclare :
 * - `key`           : la clé technique stockée dans `AvatarUnlock.avatarKey`
 *                     (cohérente avec `PRESET_AVATARS` côté users/avatar.ts).
 * - `label`         : nom user-facing FR (utilisé dans les notifs).
 * - `description`   : phrase de condition affichée côté UI ("3 jours
 *                     consécutifs de cotisation", etc.).
 * - `evaluate(s)`   : fonction qui prend l'agrégat `UserStats` et retourne
 *                     `{ unlocked: boolean, progress?: { current, target } }`.
 *
 * Note seuils en FCFA : on applique en valeur absolue peu importe la devise
 * du user (validé en Étape 0).
 */

export interface UserStats {
  /** Sur le User : best streak atteint. */
  bestStreak: number;
  /** Nombre total de Transaction (income + expense). */
  transactionsCount: number;
  /** A déjà créé un SavingsGoal au moins une fois ? */
  hasSavingsGoal: boolean;
  /** Nombre d'articles publiés par le user. */
  articlesCount: number;
  /**
   * Cumul de toutes les cotisations envoyées par le user, dérivé en sommant
   * les Transaction expense dont la catégorie est système (kind SAVINGS ou
   * POT) — qu'il s'agisse d'épargne ou de cotisations solo/groupe.
   */
  totalContributedAmount: number;
  /** A déjà reçu le badge GOAL_COMPLETED ? (proxy "objectif atteint au moins une fois") */
  hasGoalCompletedBadge: boolean;
}

export interface AvatarConditionResult {
  unlocked: boolean;
  /** Optionnel : pour l'UI "X / Y" (jours, transactions, FCFA…). */
  progress?: { current: number; target: number };
}

export interface AvatarDefinition {
  key: string;
  label: string;
  description: string;
  evaluate: (s: UserStats) => AvatarConditionResult;
}

/** Avatar par défaut, débloqué automatiquement à l'inscription. */
export const DEFAULT_AVATAR_KEY = 'pig-green';

export const AVATAR_DEFINITIONS: readonly AvatarDefinition[] = [
  {
    key: 'pig-green',
    label: 'Cochon vert',
    description: 'Débloqué dès ton inscription — la mascotte officielle.',
    evaluate: () => ({ unlocked: true }),
  },
  {
    key: 'turtle',
    label: 'Tortue',
    description: '7 jours consécutifs de cotisation.',
    evaluate: (s) => ({
      unlocked: s.bestStreak >= 7,
      progress: { current: Math.min(s.bestStreak, 7), target: 7 },
    }),
  },
  {
    key: 'bee',
    label: 'Abeille',
    description: '30 transactions enregistrées (revenus + dépenses).',
    evaluate: (s) => ({
      unlocked: s.transactionsCount >= 30,
      progress: { current: Math.min(s.transactionsCount, 30), target: 30 },
    }),
  },
  {
    key: 'fox',
    label: 'Renard',
    description:
      "Premier versement effectif sur un objectif d'épargne (créer ne suffit pas).",
    evaluate: (s) => ({
      // On exige un goal créé ET au moins un versement effectif. Créer un goal
      // est gratuit — verser prouve l'engagement.
      unlocked: s.hasSavingsGoal && s.totalContributedAmount > 0,
      progress: {
        current: s.hasSavingsGoal && s.totalContributedAmount > 0 ? 1 : 0,
        target: 1,
      },
    }),
  },
  {
    key: 'owl',
    label: 'Chouette',
    description: '3 articles de blog publiés.',
    evaluate: (s) => ({
      unlocked: s.articlesCount >= 3,
      progress: { current: Math.min(s.articlesCount, 3), target: 3 },
    }),
  },
  {
    key: 'squirrel',
    label: 'Écureuil',
    description:
      '150 000 cumulés en cotisations (épargne + cotisations groupe).',
    evaluate: (s) => ({
      unlocked: s.totalContributedAmount >= 150_000,
      progress: {
        current: Math.min(s.totalContributedAmount, 150_000),
        target: 150_000,
      },
    }),
  },
  {
    key: 'lion',
    label: 'Lion',
    description: '30 jours consécutifs de streak.',
    evaluate: (s) => ({
      unlocked: s.bestStreak >= 30,
      progress: { current: Math.min(s.bestStreak, 30), target: 30 },
    }),
  },
  {
    key: 'elephant',
    label: 'Éléphant',
    description:
      "250 000 cumulés en cotisations ET un objectif d'épargne complété.",
    evaluate: (s) => {
      const byAmount = s.totalContributedAmount >= 250_000;
      // Avant : OR — devenu trivial dès qu'un goal était terminé.
      // Maintenant : AND — la pelote de l'éléphant nécessite les deux faces.
      const unlocked = byAmount && s.hasGoalCompletedBadge;
      return {
        unlocked,
        progress: {
          current: Math.min(s.totalContributedAmount, 250_000),
          target: 250_000,
        },
      };
    },
  },
] as const;

export const AVATAR_KEYS = AVATAR_DEFINITIONS.map((a) => a.key);

export function getAvatarDefinition(key: string): AvatarDefinition | undefined {
  return AVATAR_DEFINITIONS.find((a) => a.key === key);
}
