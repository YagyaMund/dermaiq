import type OpenAI from 'openai';
import { z } from 'zod';
import { METHODOLOGY_DIGEST_MODEL } from '@/lib/openai';
import type { VisionExtractionResult } from '@/types';
import { SKINCARE_PRODUCT_TYPES } from '@/lib/prompts/vision-skincare';

const SkincareProductTypeZ = z.enum(SKINCARE_PRODUCT_TYPES);

const ResearchByNameSchema = z.object({
  product_name: z.string(),
  product_type: SkincareProductTypeZ,
  ingredients: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
  is_skincare: z.boolean(),
});

/**
 * Text-only ingredient research for a known SKU (no product photo).
 */
export async function researchProductByName(
  openai: OpenAI,
  productName: string,
  brand: string
): Promise<VisionExtractionResult | null> {
  const types = SKINCARE_PRODUCT_TYPES.filter((t) => t !== 'not_skincare').join(' | ');

  const response = await openai.chat.completions.create({
    model: METHODOLOGY_DIGEST_MODEL,
    messages: [
      {
        role: 'system',
        content: `You identify skincare / hair / body care products and their INCI lists from product name and brand only.
Return JSON only. Use published formula knowledge for the exact SKU when possible.`,
      },
      {
        role: 'user',
        content: `Product: ${productName}
Brand: ${brand}

Return:
{
  "product_name": "full official product name",
  "product_type": "${types} | not_skincare",
  "ingredients": ["INCI1", "INCI2"],
  "confidence": "high" | "medium" | "low",
  "is_skincare": true/false
}

If you cannot find a plausible INCI list, return is_skincare true with ingredients [].`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1200,
    temperature: 0.2,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) return null;

  try {
    const parsed = ResearchByNameSchema.parse(JSON.parse(text));
    if (!parsed.is_skincare || parsed.product_type === 'not_skincare') return null;
    if (parsed.ingredients.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}
