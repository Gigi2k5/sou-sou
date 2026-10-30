/**
 * Fonctionnalités activables côté serveur.
 *
 * Volontairement une constante versionnée, et non une variable
 * d'environnement : une variable peut être posée sur un serveur et oubliée sur
 * un autre, et le comportement diverge alors en silence. Ici, l'état est dans
 * le dépôt, visible en relecture.
 *
 * ⚠️ À garder en phase avec `frontend/src/lib/features.ts`.
 */
export const FEATURES = {
  /** Cotisations (pots communs). Masquées — cf. le drapeau côté frontend. */
  cotisations: false,
} as const;
