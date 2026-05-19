import type { AnalysisResult } from '@/types';

/**
 * Aligns numeric scores with methodology when the model over-penalizes a single mild concern.
 */
export function calibrateProductScore(analysis: AnalysisResult): AnalysisResult {
  const negativeItems = analysis.negative_ingredients.flatMap((c) => c.items);
  const orangeCount = negativeItems.filter((i) => i.risk_level === 'orange').length;
  const redCount = negativeItems.filter((i) => i.risk_level === 'red').length;
  const ingredientCount = analysis.detected_ingredients.length;

  if (redCount > 0 || ingredientCount < 4) {
    return analysis;
  }

  let score = analysis.score;

  if (orangeCount === 1 && redCount === 0 && ingredientCount >= 6) {
    score = Math.min(78, Math.max(score, 55));
  } else if (
    orangeCount === 0 &&
    negativeItems.length > 0 &&
    negativeItems.every((i) => i.risk_level === 'yellow') &&
    ingredientCount >= 6
  ) {
    score = Math.min(85, Math.max(score, 62));
  }

  if (score === analysis.score) {
    return analysis;
  }

  return {
    ...analysis,
    score,
    healthier_alternative:
      score >= 40 ? null : analysis.healthier_alternative,
  };
}
