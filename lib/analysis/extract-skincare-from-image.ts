import type OpenAI from 'openai';
import { z } from 'zod';
import {
  INGREDIENT_MODEL,
  VISION_MODEL,
  chatCompletionLimits,
} from '@/lib/openai';
import type { VisionExtractionResult } from '@/types';
import {
  SKINCARE_PRODUCT_TYPES,
  VISION_SKINCARE_SYSTEM,
  buildVisionSkincareUserPrompt,
} from '@/lib/prompts/vision-skincare';
import {
  INCI_LABEL_READ_SYSTEM,
  buildInciFromImageUserPrompt,
} from '@/lib/prompts/ingredient-extraction';
import {
  isPlausibleInciList,
  normalizeInciList,
} from '@/lib/analysis/normalize-inci';
import { resolveProductIngredients } from '@/lib/analysis/resolve-product-ingredients';

const SkincareProductTypeZ = z.enum(SKINCARE_PRODUCT_TYPES);

const IdentifySchema = z.object({
  product_name: z.string(),
  brand: z.string().optional(),
  product_type: SkincareProductTypeZ,
  confidence: z.enum(['high', 'medium', 'low']),
  is_skincare: z.boolean(),
});

const InciFromImageSchema = z.object({
  ingredients: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
  label_fully_visible: z.boolean().optional(),
});

/**
 * Two-pass image pipeline: identify SKU, read INCI from label, verify via research when needed.
 */
export async function extractSkincareFromImage(
  openai: OpenAI,
  imageUrl: string
): Promise<VisionExtractionResult | null> {
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

  const inciResponse = await openai.chat.completions.create({
    model: INGREDIENT_MODEL,
    temperature: 0.05,
    messages: [
      { role: 'system', content: INCI_LABEL_READ_SYSTEM },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: buildInciFromImageUserPrompt(identified.product_name),
          },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    ...chatCompletionLimits(INGREDIENT_MODEL, 2500),
  });

  let labelIngredients: string[] = [];
  let labelConfidence: 'high' | 'medium' | 'low' = 'low';

  const inciRaw = inciResponse.choices[0]?.message?.content;
  if (inciRaw) {
    try {
      const inciParsed = InciFromImageSchema.parse(JSON.parse(inciRaw));
      labelIngredients = normalizeInciList(inciParsed.ingredients);
      labelConfidence = inciParsed.confidence;
    } catch {
      /* use research fallback */
    }
  }

  const brand =
    identified.brand ??
    identified.product_name.split(/\s+/)[0] ??
    '';

  const needsResearch =
    !isPlausibleInciList(labelIngredients, 5) || labelConfidence === 'low';

  if (!needsResearch && isPlausibleInciList(labelIngredients, 5)) {
    return {
      product_name: identified.product_name,
      product_type: identified.product_type,
      ingredients: labelIngredients,
      confidence: labelConfidence,
      is_skincare: true,
    };
  }

  const researched = await resolveProductIngredients(openai, {
    product_name: identified.product_name,
    brand,
    product_type: identified.product_type,
    label_ingredients:
      labelIngredients.length > 0 ? labelIngredients : undefined,
  });

  console.log(
    'Ingredient resolution:',
    researched?.source ?? 'failed',
    researched?.ingredients.length ?? 0
  );

  if (!researched) {
    if (isPlausibleInciList(labelIngredients, 3)) {
      return {
        product_name: identified.product_name,
        product_type: identified.product_type,
        ingredients: labelIngredients,
        confidence: 'medium',
        is_skincare: true,
      };
    }
    return null;
  }

  return {
    product_name: researched.product_name,
    product_type: researched.product_type,
    ingredients: researched.ingredients,
    confidence: researched.confidence,
    is_skincare: true,
    ingredient_source: researched.source,
  };
}
