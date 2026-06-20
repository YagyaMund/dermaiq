import type OpenAI from 'openai';
import { PRODUCT_IMAGE_MODEL } from '@/lib/openai';
import { sanitizeProductImageUrl } from '@/lib/utils/product-image-url';

type ImageSearchResult = {
  type?: string;
  image_url?: string;
  thumbnail_url?: string;
  source_website_url?: string;
  caption?: string;
};

export type ResolvedSkuForImage = {
  product_name: string;
  brand: string;
  product_type: string;
  match_note?: string;
};

const GENERIC_PRODUCT_WORDS = new Set([
  'skin',
  'face',
  'body',
  'hair',
  'care',
  'cleanser',
  'wash',
  'shampoo',
  'conditioner',
  'moisturizer',
  'moisturiser',
  'cream',
  'lotion',
  'serum',
  'sunscreen',
  'toner',
  'gel',
  'oil',
  'mask',
  'spf',
  'for',
  'with',
  'the',
  'and',
  'daily',
  'gentle',
  'natural',
  'organic',
  'professional',
  'india',
  'ml',
  'gm',
  'gms',
]);

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2)
  );
}

function distinctiveVariantTokens(productName: string, brand: string): string[] {
  const brandTokens = tokenize(brand);
  return [...tokenize(productName)].filter(
    (t) => !GENERIC_PRODUCT_WORDS.has(t) && !brandTokens.has(t)
  );
}

function nameOverlapScore(query: string, candidate: string): number {
  const q = tokenize(query);
  const c = tokenize(candidate);
  if (q.size === 0 || c.size === 0) return 0;
  let hit = 0;
  for (const t of q) {
    if (c.has(t)) hit += 1;
  }
  return hit / q.size;
}

function variantTokenCoverage(tokens: string[], text: string): number {
  if (tokens.length === 0) return 1;
  const hay = text.toLowerCase();
  const hit = tokens.filter((t) => hay.includes(t)).length;
  return hit / tokens.length;
}

const RETAILER_HINTS =
  /amazon|nykaa|flipkart|sephora|ulta|target|walmart|chemistwarehouse|boots|lookfantastic|maccaron|purplle|1mg|myntra|bigbasket/i;

function scoreImageResult(
  result: ImageSearchResult,
  matchQuery: string,
  variantTokens: string[]
): number {
  const text = [result.caption, result.source_website_url].filter(Boolean).join(' ');
  const coverage = variantTokenCoverage(variantTokens, text);

  if (variantTokens.length > 0 && coverage < 0.65) return 0;

  let score = nameOverlapScore(matchQuery, text);
  score += coverage * 0.35;

  if (result.source_website_url && RETAILER_HINTS.test(result.source_website_url)) {
    score += 0.1;
  }
  if (
    result.source_website_url &&
    /pinterest|reddit|youtube|tiktok|instagram|facebook/i.test(result.source_website_url)
  ) {
    score -= 0.3;
  }
  if (result.caption && /\blogo\b|\bbanner\b|\bad\b/i.test(result.caption)) {
    score -= 0.2;
  }

  return score;
}

function pickImageUrl(result: ImageSearchResult): string | null {
  for (const raw of [result.image_url, result.thumbnail_url]) {
    const safe = sanitizeProductImageUrl(raw);
    if (safe) return safe;
  }
  return null;
}

function extractImageResults(output: unknown[]): ImageSearchResult[] {
  const results: ImageSearchResult[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const row = item as { type?: string; results?: ImageSearchResult[] };
    if (row.type !== 'web_search_call' || !Array.isArray(row.results)) continue;
    for (const result of row.results) {
      if (result?.type === 'image_result') results.push(result);
    }
  }
  return results;
}

function buildImageSearchPrompt(sku: ResolvedSkuForImage): string {
  const exactName = [sku.brand, sku.product_name].filter(Boolean).join(' ').trim();
  const note = sku.match_note ? ` Context: ${sku.match_note}.` : '';

  return `Find the official retail pack photo for this EXACT skincare SKU only:
Brand: ${sku.brand}
Product: ${sku.product_name}
Category: ${sku.product_type}${note}

Search using the full quoted product name: "${exactName}".

Requirements:
- The packaging photo MUST be this exact SKU (same variant/line keywords, not a sibling product).
- Reject other variants from the same brand (e.g. if the product is Onion Shampoo, do NOT return Argan or Tea Tree).
- Prefer Nykaa, Amazon India, Flipkart, or the brand's official product page.
- Product pack shot only — no logos, ads, or ingredient-only images.`;
}

/** Resolve a product pack photo via OpenAI web image search (uses existing OPENAI_API_KEY). */
export async function resolveProductImageFromOpenAI(
  openai: OpenAI,
  sku: ResolvedSkuForImage
): Promise<string | null> {
  const exactName = [sku.brand, sku.product_name].filter(Boolean).join(' ').trim();
  if (exactName.length < 3) return null;

  const variantTokens = distinctiveVariantTokens(sku.product_name, sku.brand);

  try {
    const response = await openai.responses.create({
      model: PRODUCT_IMAGE_MODEL,
      reasoning: { effort: 'low' },
      tools: [
        {
          type: 'web_search',
          search_content_types: ['image', 'text'],
          image_settings: { max_results: 10, caption: true },
          search_context_size: 'medium',
          user_location: { type: 'approximate', country: 'IN' },
        },
      ],
      tool_choice: { type: 'web_search' },
      include: ['web_search_call.results'],
      input: buildImageSearchPrompt(sku),
    } as unknown as Parameters<OpenAI['responses']['create']>[0]);

    const body = response as OpenAI.Responses.Response;
    const imageResults = extractImageResults(body.output ?? []);
    if (imageResults.length === 0) return null;

    let best: { score: number; image: string } | null = null;
    for (const result of imageResults) {
      const image = pickImageUrl(result);
      if (!image) continue;
      const score = scoreImageResult(result, exactName, variantTokens);
      if (score <= 0) continue;
      if (!best || score > best.score) {
        best = { score, image };
      }
    }

    if (best && best.score >= 0.35) return best.image;

    return null;
  } catch (error) {
    console.warn('OpenAI product image lookup failed:', error);
    return null;
  }
}
