/**
 * Slug ASCII conservatif : lower-case, accents retirés, non-alphanum → "-",
 * doublons fusionnés, trim. Ex: "L'épargne, c'est cool !" → "l-epargne-c-est-cool".
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining marks
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

/**
 * Suffixe "-2", "-3", ... jusqu'à trouver un slug libre.
 * `exists` retourne true si le slug est déjà pris.
 */
export async function uniqueSlug(
  base: string,
  exists: (s: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || 'article';
  let candidate = root;
  let i = 2;
  while (await exists(candidate)) {
    candidate = `${root}-${i}`;
    i += 1;
    if (i > 1000) break;
  }
  return candidate;
}
