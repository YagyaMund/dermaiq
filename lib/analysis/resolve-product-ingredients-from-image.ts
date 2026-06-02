import type OpenAI from 'openai';
import { z } from 'zod';
import { INGREDIENT_MODEL, chatCompletionLimits } from '@/lib/openai';
import { SKINCARE_PRODUCT_TYPES } from '@/lib/prompts/vision-skincare';
import {
  PRODUCT_IMAGE_INGREDIENT_SYSTEM,
  buildProductImageIngredientPrompt,
} from '@/lib/prompts/ingredient-extraction';
import { isPlausibleInciList, normalizeInciList } from '@/lib/analysis/normalize-inci';
import type { ResolvedIngredients } from '@/lib/analysis/resolve-product-ingredients';

const SkincareProductTypeZ = z.enum(SKINCARE_PRODUCT_TYPES);

const ImageResearchSchema = z.object({
  product_name: z.string(),
  brand: z.string().optional(),
  product_type: SkincareProductTypeZ,
  ingredients: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
  is_skincare: z.boolean().optional(),
  rejected_reason: z.string().nullable().optional(),
});

export type ImageIngredientResult = ResolvedIngredients & {
  is_skincare: boolean;
};

/**
 * One GPT call: identify product from packaging photo + retrieve INCI for that SKU.
 */
export async function resolveProductIngredientsFromImage(
  openai: OpenAI,
  imageUrl: string
): Promise<ImageIngredientResult | null> {
  const response = await openai.chat.completions.create({
    model: INGREDIENT_MODEL,
    temperature: 0.1,
    messages: [
      { role: 'system', content: PRODUCT_IMAGE_INGREDIENT_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildProductImageIngredientPrompt() },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    ...chatCompletionLimits(INGREDIENT_MODEL, 6000),
  });

  const text = response.choices[0]?.message?.content;
  if (!text) return null;

  try {
    const parsed = ImageResearchSchema.parse(JSON.parse(text));

    if (parsed.is_skincare === false || parsed.product_type === 'not_skincare') {
      return {
        product_name: parsed.product_name,
        product_type: 'not_skincare',
        ingredients: [],
        confidence: parsed.confidence,
        source: 'gpt_research',
        is_skincare: false,
      };
    }

    if (parsed.rejected_reason && parsed.ingredients.length === 0) {
      return null;
    }

    const ingredients = normalizeInciList(parsed.ingredients);
    if (!isPlausibleInciList(ingredients, 5)) return null;

    return {
      product_name: parsed.product_name,
      product_type: parsed.product_type,
      ingredients,
      confidence: parsed.confidence,
      source: 'gpt_research',
      is_skincare: true,
    };
  } catch {
    return null;
  }
}
