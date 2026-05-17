import type OpenAI from 'openai';
import type { AnalysisResult, VisionExtractionResult } from '@/types';
import { makeCatalogLookupKey } from '@/lib/catalog/lookup-key';
import {
  linkImageHashToCatalog,
  upsertSkincareCatalogEntry,
} from '@/lib/catalog/catalog-service';
import { resolveCachedAnalysis } from '@/lib/catalog/resolve-cache';
import { scoreSkincareFromVision } from '@/lib/analysis/score-from-vision';
import { resolveHealthierAlternativeScore } from '@/lib/analysis/resolve-healthier-alternative';
import { sanitizeProductImageUrl } from '@/lib/utils/product-image-url';

type CatalogSource = 'user_scan' | 'name_search';

export function normalizeAnalysisResult(result: AnalysisResult): AnalysisResult {
  if (!result.healthier_alternative?.image_url) return result;
  const safe = sanitizeProductImageUrl(result.healthier_alternative.image_url);
  return {
    ...result,
    healthier_alternative: { ...result.healthier_alternative, image_url: safe },
  };
}

export async function applyCatalogScoredAlternative(
  openai: OpenAI,
  result: AnalysisResult
): Promise<AnalysisResult> {
  if (!result.healthier_alternative) return result;
  const healthier_alternative = await resolveHealthierAlternativeScore(
    openai,
    result.healthier_alternative
  );
  return normalizeAnalysisResult({ ...result, healthier_alternative });
}

export async function runCatalogAnalysis(
  openai: OpenAI,
  visionData: VisionExtractionResult,
  options: { source: CatalogSource; imageHash?: string }
): Promise<AnalysisResult> {
  const lookupKey = makeCatalogLookupKey(visionData.product_name);
  const cached = await resolveCachedAnalysis(visionData.product_name);

  let analysisResult: AnalysisResult;

  if (cached) {
    analysisResult = normalizeAnalysisResult({
      ...cached,
      product_name: cached.product_name || visionData.product_name,
      from_catalog_cache: true,
    });
    if (options.imageHash) {
      await linkImageHashToCatalog(lookupKey, options.imageHash);
    }
  } else {
    analysisResult = await scoreSkincareFromVision(openai, visionData);
    analysisResult = { ...analysisResult, from_catalog_cache: false };

    await upsertSkincareCatalogEntry({
      lookupKey,
      vision: visionData,
      analysis: analysisResult,
      source: options.source,
      imageHash: options.imageHash,
    });
  }

  return applyCatalogScoredAlternative(openai, analysisResult);
}
