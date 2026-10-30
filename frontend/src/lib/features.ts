/**
 * Fonctionnalités activables, en un seul endroit.
 *
 * Masquer une fonctionnalité en dispersant des conditions dans dix fichiers,
 * c'est garantir d'en oublier une — et de laisser une porte ouverte quelque
 * part. Un drapeau unique rend l'opération réversible : une valeur à rebasculer
 * le jour où la fonctionnalité revient.
 */
export const FEATURES = {
  /**
   * Cotisations (pots communs). MASQUÉES.
   *
   * Pas à cause d'un manque de moyen de paiement, mais parce que la
   * fonctionnalité ne modélise pas la pratique qu'elle vise. Un pot commun,
   * c'est un objectif partagé : pas de tours, pas d'ordre de passage, pas de
   * bénéficiaire, donc aucune notion de retard. Chaque membre doit posséder un
   * compte, et l'organisateur ne peut rien enregistrer pour autrui.
   *
   * Une vraie tontine suppose l'inverse : des participants SANS compte, un
   * ordre de passage, et un registre tenu par l'organisateur. C'est une
   * refonte, pas un réglage — d'où le masquage en attendant.
   */
  cotisations: false,
} as const;
