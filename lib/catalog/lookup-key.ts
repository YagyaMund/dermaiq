/**
 * Stable key for catalog deduplication / cache lookup from a display product name.
 */
export function makeCatalogLookupKey(productName: string): string {
  const key = productName
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 220);
  return key.length > 0 ? key : 'unknown-product';
}
