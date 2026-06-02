import type OpenAI from 'openai';
import { z } from 'zod';
import { METHODOLOGY_DIGEST_MODEL, chatCompletionLimits } from '@/lib/openai';
import type { VisionExtractionResult } from '@/types';
import { SKINCARE_PRODUCT_TYPES } from '@/lib/prompts/vision-skincare';
import { resolveProductIngredients } from '@/lib/analysis/resolve-product-ingredients';

const SkincareProductTypeZ = z.enum(SKINCARE_PRODUCT_TYPES);

const SearchResolveSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('found'),
    product_name: z.string(),
    brand: z.string(),
    product_type: SkincareProductTypeZ,
    confidence: z.enum(['high', 'medium', 'low']),
    is_skincare: z.literal(true),
    match_type: z.enum(['exact', 'best_match']).default('exact'),
    match_note: z.string().optional(),
  }),
  z.object({
    status: z.literal('too_vague'),
    message: z.string(),
    examples: z.array(z.string()).optional(),
  }),
  z.object({
    status: z.literal('not_found'),
    message: z.string(),
  }),
  z.object({
    status: z.literal('out_of_scope'),
    message: z.string(),
  }),
]);

export type ProductSearchResolveResult = z.infer<typeof SearchResolveSchema>;

const GENERIC_ONLY =
  /^(skin\s*care|skincare|face\s*wash|body\s*wash|shampoo|conditioner|moisturizer|moisturiser|cream|lotion|soap|cleanser|sunscreen|serum|toner|gel|oil|mask|spf)$/i;

function isGenericToken(word: string): boolean {
  return GENERIC_ONLY.test(word.trim());
}

/** True when the query includes at least one brand- or product-like token (not only category words). */
export function hasSpecificSearchSignal(query: string): boolean {
  const words = query.trim().split(/\s+/).filter(Boolean);
  return words.some((w) => w.length >= 3 && !isGenericToken(w));
}

/** Fast client-side guard; server still validates with the model. */
export function isObviouslyVagueSearchQuery(query: string): boolean {
  const q = query.trim();
  if (q.length < 3) return true;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 1 && isGenericToken(words[0]!)) return true;
  if (words.length >= 2 && !hasSpecificSearchSignal(q)) return true;
  return false;
}

export async function resolveProductSearch(
  openai: OpenAI,
  query: string
): Promise<ProductSearchResolveResult> {
  const trimmed = query.trim();
  const types = SKINCARE_PRODUCT_TYPES.filter((t) => t !== 'not_skincare').join(' | ');

  const response = await openai.chat.completions.create({
    model: METHODOLOGY_DIGEST_MODEL,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: `You resolve skincare / hair / body care product searches into ONE real retail SKU sold in India or globally.

Prefer returning status "found" with the best relevant match rather than "not_found" when the user's intent is clear.

Match types:
- match_type "exact": query names a specific SKU (or trivial spelling variant).
- match_type "best_match": query is partial, informal, or category-level but clearly points to one flagship / best-selling SKU (e.g. "cetaphil cleanser" → Cetaphil Gentle Skin Cleanser; "mamaearth shampoo" → their most popular shampoo line).

Use "too_vague" ONLY when many unrelated products fit equally (e.g. "moisturizer" with no brand).
Use "not_found" ONLY when nothing in-scope is a reasonable match.
Use "out_of_scope" for non personal-care items.

Return JSON only. Do NOT include ingredients.`,
      },
      {
        role: 'user',
        content: `Search query: "${trimmed}"

Rules:
- status "found": pick ONE real product SKU. Include brand separately, match_type, and optional match_note (short, e.g. "Best match for your search").
- status "too_vague": many unrelated products fit; include message and 2–3 example queries in "examples".
- status "not_found": in-scope personal care but no reasonable product match.
- status "out_of_scope": not skin/scalp/hair personal care.

product_type must be one of: ${types}

Return ONE of:
{ "status": "found", "product_name": "...", "brand": "...", "product_type": "...", "confidence": "high"|"medium"|"low", "is_skincare": true, "match_type": "exact"|"best_match", "match_note": "optional" }
{ "status": "too_vague", "message": "...", "examples": ["..."] }
{ "status": "not_found", "message": "..." }
{ "status": "out_of_scope", "message": "..." }`,
      },
    ],
    response_format: { type: 'json_object' },
    ...chatCompletionLimits(METHODOLOGY_DIGEST_MODEL, 800),
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    return {
      status: 'not_found',
      message: 'We could not look up that product. Try a more specific name (brand + product line).',
    };
  }

  try {
    return SearchResolveSchema.parse(JSON.parse(text));
  } catch {
    return {
      status: 'not_found',
      message: 'We could not look up that product. Try a more specific name (brand + product line).',
    };
  }
}

/** Resolve search hit to vision payload with INCI lookup (supports fuzzy search queries). */
export async function searchResultToVision(
  openai: OpenAI,
  found: Extract<ProductSearchResolveResult, { status: 'found' }>,
  searchQuery?: string
): Promise<VisionExtractionResult | null> {
  const researched = await resolveProductIngredients(openai, {
    product_name: found.product_name,
    brand: found.brand,
    product_type: found.product_type,
    search_query: searchQuery,
  });

  if (!researched) return null;

  return {
    product_name: researched.product_name,
    product_type: researched.product_type ?? found.product_type,
    ingredients: researched.ingredients,
    confidence: researched.confidence,
    is_skincare: true,
    ingredient_source: researched.source,
  };
}
