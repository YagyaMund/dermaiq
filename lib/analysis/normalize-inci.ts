/** Normalize and compare INCI ingredient lists. */

const PLACEHOLDER_ONLY =
  /^(aqua|water|eau|fragrance|parfum|aroma|other\s+ingredients?|inactive\s+ingredients?)$/i;

export function normalizeInciName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.$/, '')
    .replace(/^\d+\.\s*/, '');
}

export function normalizeInciList(ingredients: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const raw of ingredients) {
    const name = normalizeInciName(raw);
    if (!name || name.length < 2) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }

  return out;
}

export function isPlausibleInciList(ingredients: string[], minCount = 3): boolean {
  const normalized = normalizeInciList(ingredients);
  if (normalized.length < minCount) return false;

  const nonPlaceholder = normalized.filter((n) => !PLACEHOLDER_ONLY.test(n));
  return nonPlaceholder.length >= Math.min(minCount, 2);
}

function tokenSet(ingredients: string[]): Set<string> {
  const tokens = new Set<string>();
  for (const ing of normalizeInciList(ingredients)) {
    const key = ing.toLowerCase();
    tokens.add(key);
    for (const part of key.split(/[^a-z0-9]+/)) {
      if (part.length > 2) tokens.add(part);
    }
  }
  return tokens;
}

/** Jaccard similarity on normalized ingredient tokens (0–1). */
export function ingredientsSimilarity(a: string[], b: string[]): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection += 1;
  }
  const union = new Set([...setA, ...setB]).size;
  return intersection / union;
}

/** True when cached catalog INCI is close enough to trust cached score. */
export function ingredientsMatchForCache(
  catalogIngredients: string[],
  currentIngredients: string[],
  threshold = 0.55
): boolean {
  return ingredientsSimilarity(catalogIngredients, currentIngredients) >= threshold;
}
