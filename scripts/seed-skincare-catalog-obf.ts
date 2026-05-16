/**
 * Fetches up to ~1000 skincare-related products from Open Beauty Facts (public API)
 * and inserts them into SkincareProductCatalog (ingredients only; scores via backfill script).
 *
 * Run: npx tsx scripts/seed-skincare-catalog-obf.ts
 * Requires: DATABASE_URL, network access
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { makeCatalogLookupKey } from '../lib/catalog/lookup-key';
import { SKINCARE_PRODUCT_TYPES } from '../lib/prompts/vision-skincare';

const TARGET = 1000;
const PAGE_SIZE = 100;

const CATEGORY_TAGS = ['face', 'body', 'sun', 'hands', 'open-beauty-facts'] as const;

function parseIngredients(text: string): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

const ALLOWED_TYPES = new Set<string>(SKINCARE_PRODUCT_TYPES.filter((t) => t !== 'not_skincare'));

function inferProductType(tags: string[]): string {
  const blob = tags.join(' ').toLowerCase();
  let v = 'moisturizer';
  if (blob.includes('sun')) v = 'sunscreen';
  else if (blob.includes('shampoo')) v = 'shampoo';
  else if (blob.includes('conditioner')) v = 'conditioner';
  else if (
    blob.includes('hair-oil') ||
    blob.includes('hair oil') ||
    blob.includes('essential-oil') ||
    blob.includes('essential oil')
  )
    v = 'hair_oil';
  else if (blob.includes('hair') && (blob.includes('serum') || blob.includes('treatment')))
    v = 'hair_serum';
  else if (blob.includes('hair') && blob.includes('mask')) v = 'hair_mask';
  else if (blob.includes('scalp')) v = 'scalp_treatment';
  else if (blob.includes('cleanser') || blob.includes('cleansing')) v = 'cleanser';
  else if (blob.includes('lip')) v = 'lip_treatment';
  else if (blob.includes('mask')) v = 'mask';
  else if (blob.includes('exfol')) v = 'exfoliant';
  else if (blob.includes('serum')) v = 'serum';
  else if (blob.includes('toner')) v = 'toner';
  else if (blob.includes('eye')) v = 'eye_care';
  else if (blob.includes('hand')) v = 'hand_care';
  else if (blob.includes('deodor') || blob.includes('antiperspir') || blob.includes('underarm'))
    v = 'deodorant';
  else if (blob.includes('body')) v = 'body_moisturizer';
  return ALLOWED_TYPES.has(v) ? v : 'moisturizer';
}

function displayName(p: {
  product_name?: string;
  brands?: string;
  code?: string;
}): string {
  const name = (p.product_name || '').trim();
  const brands = (p.brands || '').trim();
  if (name && brands) return `${brands} — ${name}`;
  if (name) return name;
  if (brands) return brands;
  return `Product ${p.code || 'unknown'}`;
}

async function fetchPage(
  tag: string,
  page: number
): Promise<
  {
    product_name?: string;
    brands?: string;
    ingredients_text?: string;
    code?: string;
    categories_tags?: string[];
  }[]
> {
  const params = new URLSearchParams({
    action: 'process',
    json: 'true',
    page_size: String(PAGE_SIZE),
    page: String(page),
    tagtype_0: 'categories',
    tag_contains_0: 'contains',
    tag_0: tag,
    fields: 'product_name,brands,ingredients_text,code,categories_tags',
  });
  const url = `https://world.openbeautyfacts.org/cgi/search.pl?${params.toString()}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'DermaIQ-catalog-seed/1.0' } });
  if (!res.ok) {
    throw new Error(`OBF HTTP ${res.status} for ${url}`);
  }
  const data = (await res.json()) as { products?: unknown[] };
  return (data.products || []) as {
    product_name?: string;
    brands?: string;
    ingredients_text?: string;
    code?: string;
    categories_tags?: string[];
  }[];
}

async function main() {
  const seenKeys = new Set<string>();
  let inserted = 0;

  for (const tag of CATEGORY_TAGS) {
    if (inserted >= TARGET) break;
    let page = 1;
    while (inserted < TARGET) {
      const products = await fetchPage(tag, page);
      if (products.length === 0) break;

      const rows: Prisma.SkincareProductCatalogCreateManyInput[] = [];

      for (const p of products) {
        if (inserted >= TARGET) break;
        const ingredients = parseIngredients(p.ingredients_text || '');
        if (ingredients.length < 4) continue;

        const name = displayName(p);
        let lookupKey = makeCatalogLookupKey(name);
        if (seenKeys.has(lookupKey) && p.code) {
          lookupKey = makeCatalogLookupKey(`${name}-${p.code}`);
        }
        if (seenKeys.has(lookupKey)) continue;
        seenKeys.add(lookupKey);

        rows.push({
          lookupKey,
          displayName: name,
          productType: inferProductType(p.categories_tags || []),
          ingredients: ingredients as unknown as Prisma.InputJsonValue,
          source: 'open_beauty_facts',
          externalId: p.code || null,
        });
      }

      if (rows.length > 0) {
        const r = await prisma.skincareProductCatalog.createMany({
          data: rows,
          skipDuplicates: true,
        });
        inserted += r.count;
        console.log(`Tag "${tag}" page ${page}: +${r.count} (total ${inserted})`);
      }

      if (products.length < PAGE_SIZE) break;
      page += 1;
      await new Promise((r) => setTimeout(r, 350));
    }
  }

  console.log(`Done. Inserted up to ${inserted} catalog rows (OBF). Run catalog:backfill to score.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
