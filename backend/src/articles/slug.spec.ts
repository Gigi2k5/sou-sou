import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('lowercases and replaces non-alphanum with dashes', () => {
    expect(slugify('Hello World')).toBe('hello-world');
  });

  it('strips accents and merges apostrophes into adjacent words', () => {
    // Apostrophes/quotes are removed without leaving a dash, so "l'épargne"
    // becomes "lepargne" — short and SEO-friendly.
    expect(slugify("L'épargne, c'est cool !")).toBe('lepargne-cest-cool');
  });

  it('collapses runs of separators', () => {
    expect(slugify('  multiple   spaces  ')).toBe('multiple-spaces');
    expect(slugify('a----b')).toBe('a-b');
  });

  it('returns empty string when input has no alphanum', () => {
    expect(slugify('!!!')).toBe('');
    expect(slugify('   ')).toBe('');
  });

  it('caps to 100 characters', () => {
    const long = 'a'.repeat(200);
    expect(slugify(long)).toHaveLength(100);
  });

  it('handles emojis (which become separators)', () => {
    expect(slugify('Hello 🎉 World')).toBe('hello-world');
  });
});

describe('uniqueSlug', () => {
  it('returns the base when free', async () => {
    const result = await uniqueSlug('Hello World', async () => false);
    expect(result).toBe('hello-world');
  });

  it('appends -2, -3 ... when collisions', async () => {
    const taken = new Set(['hello-world', 'hello-world-2', 'hello-world-3']);
    const result = await uniqueSlug('Hello World', async (s) => taken.has(s));
    expect(result).toBe('hello-world-4');
  });

  it('falls back to "article" if title produces empty slug', async () => {
    const result = await uniqueSlug('!!!', async () => false);
    expect(result).toBe('article');
  });
});
