import { randomInt } from 'node:crypto';

/**
 * Alphabet pour les codes d'invitation, **sans I/O/0/1** pour éviter
 * les confusions visuelles à l'oral / en photo (mêmes choix que la
 * fonctionnalité Tontine retirée en V2.5 — gardé pour les MoneyPots
 * groupe).
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const INVITE_CODE_LENGTH = 6;
export const INVITE_CODE_REGEX = /^[A-HJ-NP-Z2-9]{6}$/;

/** Génère un code aléatoire de 6 caractères. */
export function generateInviteCode(): string {
  let out = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i++) {
    out += ALPHABET[randomInt(0, ALPHABET.length)];
  }
  return out;
}

/**
 * Génère un code unique en réessayant jusqu'à 10 fois si collision.
 * Lève une Error si on n'y arrive pas — extrêmement improbable
 * (32^6 ≈ 1 milliard de combinaisons).
 */
export async function generateUniqueInviteCode(
  exists: (code: string) => Promise<boolean>,
): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateInviteCode();
    if (!(await exists(code))) return code;
  }
  throw new Error(
    'Impossible de générer un code unique après 10 tentatives — vérifie la table.',
  );
}

/**
 * Normalise un code saisi (uppercase, trim) et valide le format.
 * Renvoie le code propre ou `null` si invalide.
 */
export function normalizeInviteCode(input: string): string | null {
  const cleaned = input.trim().toUpperCase();
  return INVITE_CODE_REGEX.test(cleaned) ? cleaned : null;
}
