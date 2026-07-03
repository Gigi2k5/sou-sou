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
  const icon = ICONS[name];
  if (!icon) {
    // Signale l'icône manquante en dev pour qu'on l'ajoute au mapping.
    // Silent en prod pour ne pas polluer la console.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.warn(
        `[lucide-map] Icône inconnue: "${name}" — fallback sur HelpCircle. Ajoute-la dans lib/lucide-map.ts.`,
      );
    }
    return HelpCircle;
  }
  return icon;
}
