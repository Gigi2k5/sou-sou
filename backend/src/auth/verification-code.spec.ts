import {
  MAX_VERIFICATION_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_CODE_TTL_MS,
  generateVerificationCode,
  hashVerificationCode,
  normalizeVerificationCode,
} from './verification-code';

describe('generateVerificationCode', () => {
  it('génère 6 chiffres', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateVerificationCode()).toMatch(/^\d{6}$/);
    }
  });

  it('conserve les zéros de tête (longueur toujours constante)', () => {
    const codes = Array.from({ length: 500 }, generateVerificationCode);
    expect(codes.every((c) => c.length === VERIFICATION_CODE_LENGTH)).toBe(
      true,
    );
  });

  it('ne renvoie pas toujours la même valeur', () => {
    const codes = new Set(Array.from({ length: 50 }, generateVerificationCode));
    expect(codes.size).toBeGreaterThan(1);
  });
});

describe('hashVerificationCode', () => {
  it('est déterministe', () => {
    expect(hashVerificationCode('482193')).toBe(hashVerificationCode('482193'));
  });

  it('diffère pour deux codes distincts', () => {
    expect(hashVerificationCode('482193')).not.toBe(
      hashVerificationCode('482194'),
    );
  });

  it('ne contient jamais le code en clair', () => {
    expect(hashVerificationCode('482193')).not.toContain('482193');
  });

  it('distingue "012345" de "12345"', () => {
    expect(hashVerificationCode('012345')).not.toBe(
      hashVerificationCode('12345'),
    );
  });
});

describe('normalizeVerificationCode', () => {
  it('accepte un code propre', () => {
    expect(normalizeVerificationCode('482193')).toBe('482193');
  });

  it('retire espaces et tirets issus des copier-coller', () => {
    expect(normalizeVerificationCode('482 193')).toBe('482193');
    expect(normalizeVerificationCode('482-193')).toBe('482193');
    expect(normalizeVerificationCode(' 482193 ')).toBe('482193');
  });

  it('rejette les longueurs incorrectes', () => {
    expect(normalizeVerificationCode('48219')).toBeNull();
    expect(normalizeVerificationCode('4821933')).toBeNull();
    expect(normalizeVerificationCode('')).toBeNull();
  });

  it('rejette les caractères non numériques', () => {
    expect(normalizeVerificationCode('48219a')).toBeNull();
    expect(normalizeVerificationCode('abcdef')).toBeNull();
  });

  it('préserve les zéros de tête', () => {
    expect(normalizeVerificationCode('004821')).toBe('004821');
  });
});

describe('constantes', () => {
  it('TTL de 15 minutes', () => {
    expect(VERIFICATION_CODE_TTL_MS).toBe(15 * 60 * 1000);
  });

  it('laisse plusieurs essais mais borne le brute-force', () => {
    expect(MAX_VERIFICATION_ATTEMPTS).toBeGreaterThan(1);
    expect(MAX_VERIFICATION_ATTEMPTS).toBeLessThanOrEqual(10);
  });

  it('cooldown de renvoi non nul', () => {
    expect(RESEND_COOLDOWN_MS).toBeGreaterThan(0);
  });
});
