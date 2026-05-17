import type { AnalysisResult, IngredientCategory, IngredientItem } from '@/types';

function itemRiskLevels(result: AnalysisResult): string[] {
  const levels: string[] = [];
  for (const group of [...result.positive_ingredients, ...result.negative_ingredients]) {
    for (const item of group.items) {
      if (item.risk_level) levels.push(item.risk_level);
    }
  }
  return levels;
}

function partitionByRisk(groups: IngredientCategory[]): {
  positive: IngredientCategory[];
  negative: IngredientCategory[];
} {
  const positiveItems: IngredientItem[] = [];
  const negativeItems: IngredientItem[] = [];

  for (const group of groups) {
    for (const item of group.items) {
      const level = item.risk_level ?? 'green';
      if (level === 'orange' || level === 'red') {
        negativeItems.push(item);
      } else {
        positiveItems.push(item);
      }
    }
  }

  const toCategories = (items: IngredientItem[], fallback: string): IngredientCategory[] => {
    if (items.length === 0) return [];
    return [{ category: fallback, items }];
  };

  return {
    positive: toCategories(positiveItems, 'Beneficial Ingredients'),
    negative: toCategories(negativeItems, 'Ingredients of Concern'),
  };
}

function mergeCategories(existing: IngredientCategory[], extra: IngredientCategory[]): IngredientCategory[] {
  if (extra.length === 0) return existing;
  if (existing.length === 0) return extra;
  return [...existing, ...extra];
}

/**
 * Aligns score with classified risk levels (rigid band rules).
 * - No ORANGE/RED anywhere → score 50–100, no healthier alternative
 * - Any RED → score 0–24
 * - Any ORANGE (no red) → score 25–49
 */
export function enforceScoringConsistency(result: AnalysisResult): AnalysisResult {
  let positive = [...result.positive_ingredients];
  let negative = [...result.negative_ingredients];

  const repartitionPos = partitionByRisk(positive);
  const repartitionNeg = partitionByRisk(negative);
  positive = mergeCategories(repartitionPos.positive, repartitionNeg.positive);
  negative = mergeCategories(repartitionPos.negative, repartitionNeg.negative);

  const levels = itemRiskLevels({
    ...result,
    positive_ingredients: positive,
    negative_ingredients: negative,
  });

  const hasRed = levels.some((l) => l === 'red');
  const hasOrange = levels.some((l) => l === 'orange');
  const onlyGreenYellow = !hasRed && !hasOrange;

  let score = result.score;

  if (hasRed) {
    score = Math.min(score, 24);
    if (score < 0) score = 0;
  } else if (hasOrange) {
    score = Math.min(Math.max(score, 25), 49);
  } else if (onlyGreenYellow) {
    score = Math.max(score, 50);
    if (score > 100) score = 100;
  }

  const healthier_alternative =
    score >= 50 ? null : result.healthier_alternative;

  return {
    ...result,
    score,
    positive_ingredients: positive,
    negative_ingredients: negative,
    healthier_alternative,
  };
}
