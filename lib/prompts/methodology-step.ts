import OpenAI from 'openai';
import { z } from 'zod';
import { YUKA_SKINCARE_METHODOLOGY_REFERENCE } from './yuka-skincare-methodology';
import { METHODOLOGY_DIGEST_MODEL, chatCompletionLimits } from '@/lib/openai';

const DigestSchema = z.object({
  alignment_summary: z.string().max(2500),
  titanium_dioxide_notes: z.string().max(800).nullish(),
});

export type MethodologyDigest = z.infer<typeof DigestSchema>;

/**
 * Second LLM pass: forces the full Yuka-aligned reference to be processed before the scoring call.
 * Output is injected into the scoring user message.
 */
export async function runSkincareMethodologyDigestStep(
  openai: OpenAI,
  snapshot: {
    product_name: string;
    product_type: string;
    ingredients: string[];
  }
): Promise<MethodologyDigest> {
  const inciPreview = snapshot.ingredients.slice(0, 80);
  const response = await openai.chat.completions.create({
    model: METHODOLOGY_DIGEST_MODEL,
    messages: [
      {
        role: 'system',
        content: `You are a methodology clerk for DermaIQ. You do NOT score products.

You must read the entire REFERENCE block in the user message. Then produce a concise alignment_summary (plain text) that states, in your own words:
- That all scores assume regular (normal, non-sensitive) adult skin unless the product is only for sensitive/baby skin.
- Which score band rules apply (proportional mix: single orange among many greens → Fair/Good 55+, multiple orange/red → Poor/Very Poor) and how penalties interact.
- That organic labels are ignored for scoring; quantities are not inferred.
- Precautionary principle and tiered evidence (SCCS/ECHA/IARC, etc.).
- Any titanium dioxide / [nano] handling implied by the INCI list and product type.
- That unrated categories (cleaners, supplements, diapers, pads, drugs) are out of scope (already filtered).

Return ONLY JSON: { "alignment_summary": string, "titanium_dioxide_notes"?: string }
Omit titanium_dioxide_notes entirely (do not use null) when titanium dioxide is not in the INCI list or not relevant.`,
      },
      {
        role: 'user',
        content: `REFERENCE:\n${YUKA_SKINCARE_METHODOLOGY_REFERENCE}\n\nPRODUCT SNAPSHOT:\n${JSON.stringify({
          product_name: snapshot.product_name,
          product_type: snapshot.product_type,
          ingredient_count: snapshot.ingredients.length,
          ingredients_inci: inciPreview,
        })}`,
      },
    ],
    response_format: { type: 'json_object' },
    ...chatCompletionLimits(METHODOLOGY_DIGEST_MODEL, 700),
    temperature: 0.2,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error('No response from methodology digest step');
  }
  const parsed = DigestSchema.parse(JSON.parse(text));
  return parsed;
}
