import { createHash, randomInt } from 'node:crypto';

export const VERIFICATION_CODE_LENGTH = 6;
export const VERIFICATION_CODE_REGEX = /^\d{6}$/;

/** Durée de validité du code envoyé par email. */
export const VERIFICATION_CODE_TTL_MS = 15 * 60 * 1000; // 15 min
/** Essais ratés tolérés avant invalidation du code (anti brute-force). */
export const MAX_VERIFICATION_ATTEMPTS = 5;
/** Délai minimum entre deux envois pour une même adresse. */
export const RESEND_COOLDOWN_MS = 60 * 1000; // 1 min

/**
 * Génère un code à 6 chiffres, zéros de tête inclus ("004821" est valide).
 * `randomInt` est cryptographiquement sûr et sans biais modulo, contrairement
 * à `Math.random()`.
 */
export function generateVerificationCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(
    VERIFICATION_CODE_LENGTH,
    '0',
  );
}

/** SHA-256 hex — on ne stocke jamais le code en clair en base. */
export function hashVerificationCode(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

/**
 * Normalise un code saisi (espaces internes et tirets retirés — les gens
 * copient-collent "482 193" depuis leur client mail).
 * Renvoie le code propre, ou `null` si le format est invalide.
 */
export function normalizeVerificationCode(input: string): string | null {
  const cleaned = input.replace(/[\s-]/g, '');
  return VERIFICATION_CODE_REGEX.test(cleaned) ? cleaned : null;
}
