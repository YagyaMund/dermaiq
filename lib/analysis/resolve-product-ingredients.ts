import type OpenAI from 'openai';
import { z } from 'zod';
import { INGREDIENT_MODEL, chatCompletionLimits } from '@/lib/openai';
import { SKINCARE_PRODUCT_TYPES } from '@/lib/prompts/vision-skincare';
import {
  INGREDIENT_RESEARCH_SYSTEM,
  buildInciResearchUserPrompt,
} from '@/lib/prompts/ingredient-extraction';
import {
  isPlausibleInciList,
  normalizeInciList,
  ingredientsSimilarity,
} from '@/lib/analysis/normalize-inci';

const SkincareProductTypeZ = z.enum(SKINCARE_PRODUCT_TYPES);

const ResearchSchema = z.object({
  product_name: z.string(),
  product_type: SkincareProductTypeZ.optional(),
  ingredients: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
  rejected_reason: z.string().nullable().optional(),
});

export type ResolvedIngredients = {
  product_name: string;
  product_type: (typeof SKINCARE_PRODUCT_TYPES)[number];
  ingredients: string[];
  confidence: 'high' | 'medium' | 'low';
  source: 'label' | 'gpt_research' | 'merged';
};

/**
 * Resolve INCI for a product SKU via GPT (gpt-5.4), with optional label list as primary source.
 */
export async function resolveProductIngredients(
  openai: OpenAI,
  params: {
    product_name: string;
    brand?: string;
    product_type?: string;
    label_ingredients?: string[];
    /** Original user search text when the SKU was fuzzy-matched. */
    search_query?: string;
  }
): Promise<ResolvedIngredients | null> {
  const productTypeHint = params.product_type ?? 'moisturizer';
  const labelNorm = params.label_ingredients
    ? normalizeInciList(params.label_ingredients)
    : [];

  const response = await openai.chat.completions.create({
    model: INGREDIENT_MODEL,
    temperature: 0.1,
    messages: [
      { role: 'system', content: INGREDIENT_RESEARCH_SYSTEM },
      {
        role: 'user',
        content: buildInciResearchUserPrompt({
          ...params,
          product_type: productTypeHint,
        }),
      },
    ],
    response_format: { type: 'json_object' },
    ...chatCompletionLimits(INGREDIENT_MODEL, 5000),
  });

  const text = response.choices[0]?.message?.content;
  if (!text) return null;

  try {
    const parsed = ResearchSchema.parse(JSON.parse(text));
    if (parsed.rejected_reason && parsed.ingredients.length === 0) {
      return null;
    }

    const gptIngredients = normalizeInciList(parsed.ingredients);
    if (!isPlausibleInciList(gptIngredients)) {
      if (!isPlausibleInciList(labelNorm)) return null;
    }

    const product_type =
      parsed.product_type && parsed.product_type !== 'not_skincare'
        ? parsed.product_type
        : SkincareProductTypeZ.safeParse(productTypeHint).success
          ? (productTypeHint as ResolvedIngredients['product_type'])
          : 'moisturizer';

    if (isPlausibleInciList(labelNorm) && isPlausibleInciList(gptIngredients)) {
      const sim = ingredientsSimilarity(labelNorm, gptIngredients);
      if (sim >= 0.45 && labelNorm.length >= gptIngredients.length * 0.7) {
        return {
          product_name: parsed.product_name || params.product_name,
          product_type,
          ingredients: labelNorm,
          confidence: 'high',
          source: 'label',
        };
      }
      return {
        product_name: parsed.product_name || params.product_name,
        product_type,
        ingredients: gptIngredients,
        confidence: parsed.confidence,
        source: 'merged',
      };
    }

    if (isPlausibleInciList(labelNorm)) {
      return {
        product_name: params.product_name,
        product_type,
        ingredients: labelNorm,
        confidence: 'high',
        source: 'label',
      };
    }

    if (!isPlausibleInciList(gptIngredients)) return null;

    return {
      product_name: parsed.product_name || params.product_name,
      product_type,
      ingredients: gptIngredients,
      confidence: parsed.confidence,
      source: 'gpt_research',
    };
  } catch {
    return null;
  }
}
