/**
 * Citations rotatives pour le mood `idle` / `happy` (priorité 10 — fallback).
 * Pool différencié par contexte pour adapter le ton :
 *   - `dashboard` : tout est possible
 *   - `savings`   : focus épargne
 *   - `recap`     : focus stats / persévérance
 */

export const QUOTES_DASHBOARD = [
  {
    mood: 'idle' as const,
    message: "Petit à petit, l'oiseau fait son nid",
    emoji: '🪺',
  },
  {
    mood: 'happy' as const,
    message: "Aujourd'hui est un bon jour pour économiser",
    emoji: '💰',
  },
  {
    mood: 'idle' as const,
    message: "Discipline aujourd'hui, liberté demain",
    emoji: '🔓',
  },
  {
    mood: 'happy' as const,
    message: 'Tes objectifs sont à portée, un pas à la fois',
    emoji: '🎯',
  },
  {
    mood: 'idle' as const,
    message: "L'argent économisé, c'est de la liberté gagnée",
    emoji: '🦅',
  },
];

export const QUOTES_SAVINGS = [
  {
    mood: 'idle' as const,
    message: 'Chaque pièce économisée est une victoire',
    emoji: '🐷',
  },
  {
    mood: 'happy' as const,
    message: "L'épargne, c'est la liberté de demain",
    emoji: '✨',
  },
  {
    mood: 'idle' as const,
    message: 'Chaque grand pot a commencé par une seule pièce',
    emoji: '🏺',
  },
  {
    mood: 'happy' as const,
    message: 'Mets de côté maintenant, profite plus tard',
    emoji: '🌱',
  },
];

export const QUOTES_RECAP = [
  {
    mood: 'idle' as const,
    message: "Garde la cadence, c'est la régularité qui paie",
    emoji: '📈',
  },
  {
    mood: 'happy' as const,
    message: 'Compare, ajuste, avance. Tu es sur la bonne voie',
    emoji: '🧭',
  },
  {
    mood: 'idle' as const,
    message: "Les petits efforts d'aujourd'hui se voient demain",
    emoji: '🌅',
  },
];

export type QuotePool = typeof QUOTES_DASHBOARD;

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
