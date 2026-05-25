/**
 * Sources de revenus & catégories de dépenses pré-remplies à l'inscription
 * pour éviter la page blanche. Adaptées au contexte africain francophone
 * (FCFA, mobile money, envois famille...).
 *
 * L'utilisateur peut les renommer / supprimer / compléter à tout moment
 * depuis la page Paramètres → Sources / Catégories.
 */

export const DEFAULT_INCOME_SOURCES: readonly string[] = [
  'Salaire',
  'Freelance / Activité indépendante',
  'Business',
  'Famille / Aide',
  'Autre',
] as const;

export const DEFAULT_EXPENSE_CATEGORIES: readonly string[] = [
  'Loyer',
  'Nourriture',
  'Transport (taxi / zem / bus)',
  'Mobile money / Frais bancaires',
  'Électricité / Eau',
  'Internet / Téléphone',
  'Famille (envois)',
  'Santé',
  'Loisirs',
  'Vêtements',
  'Éducation',
  'Autre',
] as const;
