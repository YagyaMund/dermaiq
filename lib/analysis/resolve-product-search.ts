import type OpenAI from 'openai';
import { z } from 'zod';
import { METHODOLOGY_DIGEST_MODEL } from '@/lib/openai';
import type { VisionExtractionResult } from '@/types';
import { SKINCARE_PRODUCT_TYPES } from '@/lib/prompts/vision-skincare';

const SkincareProductTypeZ = z.enum(SKINCARE_PRODUCT_TYPES);

const SearchResolveSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('found'),
    product_name: z.string(),
    brand: z.string(),
    product_type: SkincareProductTypeZ,
    ingredients: z.array(z.string()).min(1),
    confidence: z.enum(['high', 'medium', 'low']),
    is_skincare: z.literal(true),
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

/** Fast client-side guard; server still validates with the model. */
export function isObviouslyVagueSearchQuery(query: string): boolean {
  const q = query.trim();
  if (q.length < 4) return true;
  const words = q.split(/\s+/).filter(Boolean);
  if (words.length === 1 && GENERIC_ONLY.test(words[0]!)) return true;
  if (words.length <= 2 && words.every((w) => GENERIC_ONLY.test(w))) return true;
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
    messages: [
      {
        role: 'system',
        content: `You resolve skincare / hair / body care product searches into one exact retail SKU and its INCI list.
Return JSON only. Use published formulas when confident.`,
      },
      {
        role: 'user',
        content: `Search query: "${trimmed}"

Rules:
- status "found": you can identify ONE specific product SKU (include brand in product_name) with a plausible full INCI list (at least 5 ingredients when known).
- status "too_vague": the query could mean many different products (e.g. only "shampoo", "moisturizer", "Cetaphil" without cleanser vs lotion, or only a brand with no product line). Include a helpful message and 2–3 example queries in "examples".
- status "not_found": in-scope personal care but you cannot find a real product or INCI list matching the query.
- status "out_of_scope": not skin/scalp/hair personal care (e.g. medicine, food supplement, household cleaner).

product_type must be one of: ${types} (not not_skincare when found).

Return ONE of:
{ "status": "found", "product_name": "...", "brand": "...", "product_type": "...", "ingredients": ["..."], "confidence": "high"|"medium"|"low", "is_skincare": true }
{ "status": "too_vague", "message": "...", "examples": ["..."] }
{ "status": "not_found", "message": "..." }
{ "status": "out_of_scope", "message": "..." }`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1400,
    temperature: 0.2,
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

export function searchResultToVision(
  found: Extract<ProductSearchResolveResult, { status: 'found' }>
): VisionExtractionResult {
  return {
    product_name: found.product_name,
    product_type: found.product_type,
    ingredients: found.ingredients,
    confidence: found.confidence,
    is_skincare: true,
  };
}
