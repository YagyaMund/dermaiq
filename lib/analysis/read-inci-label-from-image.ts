import type OpenAI from 'openai';
import { z } from 'zod';
import { INGREDIENT_MODEL, chatCompletionLimits } from '@/lib/openai';
import {
  INCI_LABEL_READ_SYSTEM,
  buildInciFromImageUserPrompt,
} from '@/lib/prompts/ingredient-extraction';
import { isPlausibleInciList, normalizeInciList } from '@/lib/analysis/normalize-inci';

const LabelReadSchema = z.object({
  ingredients: z.array(z.string()),
  confidence: z.enum(['high', 'medium', 'low']),
  label_fully_visible: z.boolean().optional(),
});

export type LabelInciReadResult = {
  ingredients: string[];
  confidence: 'high' | 'medium' | 'low';
  label_fully_visible: boolean;
};

/** OCR pass: transcribe INCI from ingredients panel when visible on photo. */
export async function readInciLabelFromImage(
  openai: OpenAI,
  imageUrl: string,
  productHint?: string
): Promise<LabelInciReadResult | null> {
  const response = await openai.chat.completions.create({
    model: INGREDIENT_MODEL,
    temperature: 0.05,
    messages: [
      { role: 'system', content: INCI_LABEL_READ_SYSTEM },
      {
        role: 'user',
        content: [
          { type: 'text', text: buildInciFromImageUserPrompt(productHint) },
          { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
        ],
      },
    ],
    response_format: { type: 'json_object' },
    ...chatCompletionLimits(INGREDIENT_MODEL, 4000),
  });

  const text = response.choices[0]?.message?.content;
  if (!text) return null;

  try {
    const parsed = LabelReadSchema.parse(JSON.parse(text));
    const ingredients = normalizeInciList(parsed.ingredients);
    if (!isPlausibleInciList(ingredients)) return null;

    return {
      ingredients,
      confidence: parsed.confidence,
      label_fully_visible: parsed.label_fully_visible ?? ingredients.length >= 8,
    };
  } catch {
    return null;
  }
}
