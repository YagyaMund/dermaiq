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

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length > 2)
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

const RETAILER_HINTS =
  /amazon|nykaa|flipkart|sephora|ulta|target|walmart|chemistwarehouse|boots|lookfantastic|maccaron|purplle|1mg|myntra|bigbasket/i;

function scoreImageResult(result: ImageSearchResult, matchQuery: string): number {
  const text = [result.caption, result.source_website_url].filter(Boolean).join(' ');
  let score = nameOverlapScore(matchQuery, text);
  if (result.source_website_url && RETAILER_HINTS.test(result.source_website_url)) {
    score += 0.15;
  }
  if (result.source_website_url && /pinterest|reddit|youtube|tiktok|instagram|facebook/i.test(result.source_website_url)) {
    score -= 0.25;
  }
  if (result.caption && /\blogo\b|\bbanner\b|\bad\b/i.test(result.caption)) {
    score -= 0.15;
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

/** Resolve a product pack photo via OpenAI web image search (uses existing OPENAI_API_KEY). */
export async function resolveProductImageFromOpenAI(
  openai: OpenAI,
  params: {
    product_name: string;
    brand?: string;
    search_query?: string;
  }
): Promise<string | null> {
  const identity = [params.brand, params.product_name].filter(Boolean).join(' ').trim();
  const hint = params.search_query?.trim();
  if (identity.length < 3) return null;

  const searchHint =
    hint && hint.toLowerCase() !== identity.toLowerCase() ? ` User searched: "${hint}".` : '';

  try {
    const response = await openai.responses.create({
      model: PRODUCT_IMAGE_MODEL,
      reasoning: { effort: 'low' },
      tools: [
        {
          type: 'web_search',
          search_content_types: ['image', 'text'],
          image_settings: { max_results: 6, caption: true },
          search_context_size: 'low',
          user_location: { type: 'approximate', country: 'IN' },
        },
      ],
      tool_choice: { type: 'web_search' },
      include: ['web_search_call.results'],
      input: `Find official retail pack photos for this skincare product: ${identity}.${searchHint} Prefer product listing images from Nykaa, Amazon, Flipkart, or the brand's site. Packaging photo only, not logos or ads.`,
    } as unknown as Parameters<OpenAI['responses']['create']>[0]);

    const body = response as OpenAI.Responses.Response;
    const imageResults = extractImageResults(body.output ?? []);
    if (imageResults.length === 0) return null;

    let best: { score: number; image: string } | null = null;
    for (const result of imageResults) {
      const image = pickImageUrl(result);
      if (!image) continue;
      const score = scoreImageResult(result, identity);
      if (!best || score > best.score) {
        best = { score, image };
      }
    }

    if (best && best.score >= 0.15) return best.image;

    const first = imageResults.map(pickImageUrl).find(Boolean);
    return first ?? null;
  } catch (error) {
    console.warn('OpenAI product image lookup failed:', error);
    return null;
  }
}
