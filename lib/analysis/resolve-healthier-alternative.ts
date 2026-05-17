import type OpenAI from 'openai';
import type { AnalysisResult, HealthierAlternative } from '@/types';
import { scoreSkincareFromVision } from '@/lib/analysis/score-from-vision';
import { researchProductByName } from '@/lib/analysis/research-product-by-name';
import { makeCatalogLookupKey } from '@/lib/catalog/lookup-key';
import { upsertSkincareCatalogEntry } from '@/lib/catalog/catalog-service';
import { resolveCachedAnalysis } from '@/lib/catalog/resolve-cache';
import { sanitizeProductImageUrl } from '@/lib/utils/product-image-url';

/**
 * Replaces LLM-guessed estimated_score with a real catalog score:
 * - catalog hit → reuse stored analysis score (same as when that product is scanned later)
 * - catalog miss → research INCI by name, run full scoring, upsert catalog
 */
export async function resolveHealthierAlternativeScore(
  openai: OpenAI,
  alt: HealthierAlternative
): Promise<HealthierAlternative> {
  const cached = await resolveCachedAnalysis(alt.product_name);
  if (cached) {
    console.log(
      'Healthier alternative catalog HIT:',
      makeCatalogLookupKey(alt.product_name),
      'score=',
      cached.score
    );
    return {
      ...alt,
      product_name: cached.product_name,
      estimated_score: cached.score,
      image_url: sanitizeProductImageUrl(alt.image_url),
    };
  }

  const vision = await researchProductByName(openai, alt.product_name, alt.brand);
  if (!vision) {
    console.warn(
      'Healthier alternative: could not research ingredients, keeping LLM estimate:',
      alt.product_name
    );
    return alt;
  }

  console.log('Healthier alternative catalog MISS — scoring:', vision.product_name);
  const lookupKey = makeCatalogLookupKey(vision.product_name);
  const scored = await scoreSkincareFromVision(openai, vision);

  const forCatalog: AnalysisResult = {
    ...scored,
    healthier_alternative: null,
    from_catalog_cache: false,
  };

  await upsertSkincareCatalogEntry({
    lookupKey,
    vision,
    analysis: forCatalog,
    source: 'alternative_suggestion',
  });

  return {
    ...alt,
    product_name: scored.product_name,
    estimated_score: scored.score,
    image_url: sanitizeProductImageUrl(alt.image_url),
  };
}
