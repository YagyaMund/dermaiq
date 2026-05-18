import type OpenAI from 'openai';
import { z } from 'zod';
import { VISION_MODEL } from '@/lib/openai';
import type { VisionExtractionResult } from '@/types';
import {
  SKINCARE_PRODUCT_TYPES,
  VISION_SKINCARE_SYSTEM,
  buildVisionSkincareUserPrompt,
} from '@/lib/prompts/vision-skincare';
import { resolveProductIngredients } from '@/lib/analysis/resolve-product-ingredients';
import { resolveProductIngredientsFromImage } from '@/lib/analysis/resolve-product-ingredients-from-image';

const SkincareProductTypeZ = z.enum(SKINCARE_PRODUCT_TYPES);

const IdentifySchema = z.object({
  product_name: z.string(),
  brand: z.string().optional(),
  product_type: SkincareProductTypeZ,
  confidence: z.enum(['high', 'medium', 'low']),
  is_skincare: z.boolean(),
});

/**
 * Image scan: identify product + INCI via one GPT vision call; fallback to identify + text INCI lookup.
 */
export async function extractSkincareFromImage(
  openai: OpenAI,
  imageUrl: string
): Promise<VisionExtractionResult | null> {
  const fromImage = await resolveProductIngredientsFromImage(openai, imageUrl);

  if (fromImage) {
    if (!fromImage.is_skincare) {
      return {
        product_name: fromImage.product_name,
        product_type: 'not_skincare',
        ingredients: [],
        confidence: fromImage.confidence,
        is_skincare: false,
      };
    }

    console.log(
      'Ingredient resolution (image):',
      fromImage.source,
      fromImage.ingredients.length
    );

    return {
      product_name: fromImage.product_name,
      product_type: fromImage.product_type,
      ingredients: fromImage.ingredients,
      confidence: fromImage.confidence,
      is_skincare: true,
      ingredient_source: fromImage.source,
    };
  }

  console.log('Image INCI call failed; falling back to identify + text research');

  const identifyResponse = await openai.chat.completions.create({
    model: VISION_MODEL,
    temperature: 0.1,
    messages: [
      { role: 'system', content: VISION_SKINCARE_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildVisionSkincareUserPrompt() },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 1200,
  });

  const identifyRaw = identifyResponse.choices[0]?.message?.content;
  if (!identifyRaw) return null;

  let identified: z.infer<typeof IdentifySchema>;
  try {
    const parsed = IdentifySchema.parse(JSON.parse(identifyRaw));
    if (!parsed.is_skincare || parsed.product_type === 'not_skincare') {
      return {
        product_name: parsed.product_name,
        product_type: 'not_skincare',
        ingredients: [],
        confidence: parsed.confidence,
        is_skincare: false,
      };
    }
    identified = parsed;
  } catch {
    return null;
  }

  const brand =
    identified.brand ??
    identified.product_name.split(/\s+/)[0] ??
    '';

  const researched = await resolveProductIngredients(openai, {
    product_name: identified.product_name,
    brand,
    product_type: identified.product_type,
  });

  console.log(
    'Ingredient resolution (fallback):',
    researched?.source ?? 'failed',
    researched?.ingredients.length ?? 0
  );

  if (!researched) return null;

  return {
    product_name: researched.product_name,
    product_type: researched.product_type,
    ingredients: researched.ingredients,
    confidence: researched.confidence,
    is_skincare: true,
    ingredient_source: researched.source,
  };
}
