import type OpenAI from 'openai';
import type { AnalysisResult, VisionExtractionResult } from '@/types';
import { getOpenAI, TEXT_MODEL } from '@/lib/openai';
import { buildSkincareScoringSystemPrompt } from '@/lib/prompts/scoring-skincare';
import { runSkincareMethodologyDigestStep } from '@/lib/prompts/methodology-step';
import { ScoringResultSchema } from '@/lib/analysis/scoring-schema';
import { REGULAR_SKIN_EVALUATION_CONTEXT } from '@/lib/prompts/regular-skin-context';

/**
 * Runs methodology digest + scoring for a skincare vision payload (same as /api/analyze).
 */
export async function scoreSkincareFromVision(
  openai: OpenAI,
  visionData: VisionExtractionResult
): Promise<AnalysisResult> {
  const methodologyDigest = await runSkincareMethodologyDigestStep(openai, {
    product_name: visionData.product_name,
    product_type: visionData.product_type,
    ingredients: visionData.ingredients,
  });

  const ingredientCount = visionData.ingredients.length;
  const scoringSystemPrompt = buildSkincareScoringSystemPrompt();

  const scoringResponse = await openai.chat.completions.create({
    model: TEXT_MODEL,
    messages: [
      {
        role: 'system',
        content: scoringSystemPrompt,
      },
      {
        role: 'user',
        content: `=== METHODOLOGY DIGEST (from prior step — honor this) ===
${methodologyDigest.alignment_summary}
${methodologyDigest.titanium_dioxide_notes ? `\nTitanium dioxide notes: ${methodologyDigest.titanium_dioxide_notes}\n` : ''}
=== END DIGEST ===

${REGULAR_SKIN_EVALUATION_CONTEXT}

Analyze this ${visionData.product_type} product using the risk-based scoring system (Very Poor 0–20, Poor 20–40, Fair 40–60, Good 60–80, Excellent 80–100; driven by highest-risk ingredient):

Product: ${visionData.product_name}
Type: ${visionData.product_type}
Total Ingredient Count: ${ingredientCount}
Full Ingredient List (INCI): ${visionData.ingredients.join(', ')}

You MUST:
1. Classify each ingredient as green/yellow/orange/red using the Yuka methodology in PART A
2. Set the score band from the highest-risk ingredient, then apply penalties within that band
3. Group green/yellow ingredients under positive_ingredients; orange/red under negative_ingredients
4. Write an honest 2–3 sentence verdict for regular consumers
5. If final score < 40, suggest a healthier alternative with estimated_score in the correct band; if score ≥ 40, set healthier_alternative to null

Use SIMPLE everyday names (e.g. "Vitamin E" not "Tocopheryl Acetate", "Shea Butter" not "Butyrospermum Parkii").
For negative ingredients, include the technical name in brackets (e.g. "Sulfates [SLS/SLES]").

Return STRICTLY in this JSON format:
{
  "product_name": "${visionData.product_name}",
  "product_type": "${visionData.product_type}",
  "detected_ingredients": ["ingredient1", "ingredient2", ...],
  "score": <number 0-100, calculated using the penalty system>,
  "positive_ingredients": [
    {
      "category": "Moisturizers & Hydrators",
      "items": [
        { "name": "Simple name", "benefit": "Simple explanation", "risk_level": "green" }
      ]
    }
  ],
  "negative_ingredients": [
    {
      "category": "Fragrances & Scents",
      "items": [
        { "name": "Simple name [Technical name]", "concern": "Simple explanation", "risk_level": "orange" }
      ]
    }
  ],
  "verdict": "Honest 2-3 sentence summary",
  "healthier_alternative": ${'{'}
    "product_name": "Full Product Name",
    "brand": "Brand Name",
    "estimated_score": <number>,
    "reason": "Why this is a better choice",
    "image_url": "https://example.com/product-image.jpg" OR null
  ${'}'} OR null if score >= 40
}`,
      },
    ],
    response_format: { type: 'json_object' },
    max_tokens: 3500,
  });

  const scoringContent = scoringResponse.choices[0].message.content;
  if (!scoringContent) {
    throw new Error('No response from scoring API');
  }

  const parsed = JSON.parse(scoringContent);
  return ScoringResultSchema.parse(parsed);
}

/** For scripts: lazy OpenAI client. */
export async function scoreSkincareFromVisionWithDefaultClient(
  visionData: VisionExtractionResult
): Promise<AnalysisResult> {
  return scoreSkincareFromVision(getOpenAI(), visionData);
}
