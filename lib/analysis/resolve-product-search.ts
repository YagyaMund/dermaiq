import type OpenAI from 'openai';
import { z } from 'zod';
import { METHODOLOGY_DIGEST_MODEL } from '@/lib/openai';
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
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: `You resolve skincare / hair / body care product searches into ONE exact retail SKU (brand + product line + variant).
Return JSON only. Do NOT include ingredients in this step — only identify the product.`,
      },
      {
        role: 'user',
        content: `Search query: "${trimmed}"

Rules:
- status "found": you can identify ONE specific product SKU. Include brand separately.
- status "too_vague": the query could mean many different products. Include message and 2–3 example queries in "examples".
- status "not_found": in-scope personal care but you cannot identify a real product matching the query.
- status "out_of_scope": not skin/scalp/hair personal care.

product_type must be one of: ${types}

Return ONE of:
{ "status": "found", "product_name": "...", "brand": "...", "product_type": "...", "confidence": "high"|"medium"|"low", "is_skincare": true }
{ "status": "too_vague", "message": "...", "examples": ["..."] }
{ "status": "not_found", "message": "..." }
{ "status": "out_of_scope", "message": "..." }`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 800,
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

/** Resolve search hit to vision payload with strict INCI lookup. */
export async function searchResultToVision(
  openai: OpenAI,
  found: Extract<ProductSearchResolveResult, { status: 'found' }>
): Promise<VisionExtractionResult | null> {
  const researched = await resolveProductIngredients(openai, {
    product_name: found.product_name,
    brand: found.brand,
    product_type: found.product_type,
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
