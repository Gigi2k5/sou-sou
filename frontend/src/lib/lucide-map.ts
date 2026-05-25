import {
  Award,
  Flame,
  Gem,
  HelpCircle,
  PartyPopper,
  Sprout,
  Star,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react";

/**
 * Map les noms d'icônes envoyés par l'API gamification (champ Badge.icon)
 * vers les composants `lucide-react`. Étendre ce map quand on ajoute un badge.
 */
const ICONS: Record<string, LucideIcon> = {
  Award,
  Flame,
  Gem,
  PartyPopper,
  Sprout,
  Star,
  Target,
  Trophy,
  Zap,
};

export function getLucideIcon(name: string): LucideIcon {
  return ICONS[name] ?? HelpCircle;
}
