/**
 * Définition canonique des badges Sou'Sou.
 * Synchronisé en DB au démarrage par GamificationService.onModuleInit().
 *
 * `icon` est un nom de composant `lucide-react` que le front résout via
 * un mapping. On évite les emojis pour garder un rendu cohérent à travers
 * les plateformes.
 */
export interface BadgeSeed {
  code: string;
  name: string;
  description: string;
  icon: string;
}

export const BADGES: readonly BadgeSeed[] = [
  {
    code: 'FIRST_CONTRIB',
    name: 'Première graine',
    description: 'Tu as effectué ta toute première contribution.',
    icon: 'Sprout',
  },
  {
    code: 'STREAK_3',
    name: 'En route',
    description: "3 jours d'épargne consécutifs.",
    icon: 'Flame',
  },
  {
    code: 'STREAK_7',
    name: 'Sur la lancée',
    description: "7 jours d'épargne consécutifs.",
    icon: 'Zap',
  },
  {
    code: 'STREAK_30',
    name: 'Inarrêtable',
    description: "30 jours d'épargne consécutifs.",
    icon: 'Trophy',
  },
  {
    code: 'POINTS_100',
    name: 'Centurion',
    description: '100 points cumulés — tu chauffes.',
    icon: 'Target',
  },
  {
    code: 'POINTS_500',
    name: 'Investi',
    description: '500 points cumulés — sérieux niveau.',
    icon: 'Gem',
  },
  {
    code: 'GOAL_COMPLETED',
    name: 'Objectif atteint',
    description: "Tu as réussi ton objectif d'épargne.",
    icon: 'PartyPopper',
  },
  {
    code: 'POPULAR_ARTICLE',
    name: 'Populaire',
    description:
      'Un de tes articles a dépassé les 10 likes — ton message porte !',
    icon: 'Heart',
  },
  {
    code: 'WELCOME',
    name: 'Bienvenue',
    description: 'Tu as terminé ton onboarding et fait le tour de l’app.',
    icon: 'PartyPopper',
  },
] as const;
