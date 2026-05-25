import {
  generateInviteCode,
  generateUniqueInviteCode,
  INVITE_CODE_LENGTH,
  INVITE_CODE_REGEX,
  normalizeInviteCode,
} from './invite-code';

describe('generateInviteCode', () => {
  it('génère un code de 6 caractères', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode();
      expect(code).toHaveLength(INVITE_CODE_LENGTH);
    }
  });

  it("utilise uniquement des caractères de l'alphabet anti-confusion", () => {
    const allowed = /^[A-HJ-NP-Z2-9]+$/;
    for (let i = 0; i < 100; i++) {
      const code = generateInviteCode();
      expect(code).toMatch(allowed);
      expect(code).not.toMatch(/[IO01]/);
    }
  });

  it('produit des codes différents (pas de constante)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add(generateInviteCode());
    // Avec 32^6 = 1 073 741 824 combinaisons, 50 tirages quasi-jamais doublons.
    expect(seen.size).toBeGreaterThan(45);
  });
});

describe('normalizeInviteCode', () => {
  it('met en majuscules et trim', () => {
    expect(normalizeInviteCode(' a2b3c4 ')).toBe('A2B3C4');
  });

  it('rejette les codes trop courts ou trop longs', () => {
    expect(normalizeInviteCode('ABC')).toBeNull();
    expect(normalizeInviteCode('ABCDEFG')).toBeNull();
  });

  it('rejette les caractères interdits (I, O, 0, 1)', () => {
    expect(normalizeInviteCode('IIIIII')).toBeNull();
    expect(normalizeInviteCode('OOOOOO')).toBeNull();
    expect(normalizeInviteCode('000000')).toBeNull();
    expect(normalizeInviteCode('111111')).toBeNull();
    expect(normalizeInviteCode('A2B3O4')).toBeNull();
  });

  it('rejette les caractères non-alphanumériques', () => {
    expect(normalizeInviteCode('AB-CDE')).toBeNull();
    expect(normalizeInviteCode('!@#$%^')).toBeNull();
  });

  it('accepte un code valide', () => {
    expect(normalizeInviteCode('A2B3C4')).toBe('A2B3C4');
    expect(normalizeInviteCode('a2b3c4')).toBe('A2B3C4');
  });
});

describe('INVITE_CODE_REGEX', () => {
  it('rejette les caractères interdits', () => {
    expect(INVITE_CODE_REGEX.test('IIIIII')).toBe(false);
    expect(INVITE_CODE_REGEX.test('OOOOOO')).toBe(false);
    expect(INVITE_CODE_REGEX.test('000000')).toBe(false);
    expect(INVITE_CODE_REGEX.test('111111')).toBe(false);
  });

  it('accepte un code valide', () => {
    expect(INVITE_CODE_REGEX.test('A2B3C4')).toBe(true);
  });
});

describe('generateUniqueInviteCode', () => {
  it('renvoie un code si exists() retourne false', async () => {
    const exists = jest.fn().mockResolvedValue(false);
    const code = await generateUniqueInviteCode(exists);
    expect(code).toMatch(INVITE_CODE_REGEX);
    expect(exists).toHaveBeenCalledTimes(1);
  });

  it('réessaie en cas de collision', async () => {
    const exists = jest
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const code = await generateUniqueInviteCode(exists);
    expect(code).toMatch(INVITE_CODE_REGEX);
    expect(exists).toHaveBeenCalledTimes(3);
  });

  it('lève après 10 tentatives en collision permanente', async () => {
    const exists = jest.fn().mockResolvedValue(true);
    await expect(generateUniqueInviteCode(exists)).rejects.toThrow(
      /10 tentatives/,
    );
    expect(exists).toHaveBeenCalledTimes(10);
  });
});
