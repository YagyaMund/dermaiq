import type OpenAI from 'openai';
import { z } from 'zod';
import { VISION_MODEL, chatCompletionLimits } from '@/lib/openai';
import {
  SKINCARE_PRODUCT_TYPES,
  VISION_SKINCARE_SYSTEM,
  buildVisionSkincareUserPrompt,
} from '@/lib/prompts/vision-skincare';

const SkincareProductTypeZ = z.enum(SKINCARE_PRODUCT_TYPES);

const IdentifySchema = z.object({
  product_name: z.string().min(2),
  brand: z.string().optional(),
  product_type: SkincareProductTypeZ,
  confidence: z.enum(['high', 'medium', 'low']),
  is_skincare: z.boolean(),
});

export type IdentifiedProduct = z.infer<typeof IdentifySchema>;

/** Vision pass: brand + product line from pack photo (no INCI). */
export async function identifyProductFromImage(
  openai: OpenAI,
  imageUrl: string
): Promise<IdentifiedProduct | null> {
  const response = await openai.chat.completions.create({
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
    ...chatCompletionLimits(VISION_MODEL, 1500),
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) return null;

  try {
    return IdentifySchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}
