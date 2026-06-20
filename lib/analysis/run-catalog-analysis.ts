import type OpenAI from 'openai';
import type { AnalysisResult, VisionExtractionResult } from '@/types';
import { makeCatalogLookupKey } from '@/lib/catalog/lookup-key';
import {
  getCatalogStoredIngredients,
  linkImageHashToCatalog,
  upsertSkincareCatalogEntry,
} from '@/lib/catalog/catalog-service';
import { resolveCachedAnalysis } from '@/lib/catalog/resolve-cache';
import { scoreSkincareFromVision } from '@/lib/analysis/score-from-vision';
import { resolveHealthierAlternativeScore } from '@/lib/analysis/resolve-healthier-alternative';
import { ingredientsMatchForCache } from '@/lib/analysis/normalize-inci';
import { resolveProductImageFromGoogle } from '@/lib/catalog/resolve-product-image-google';
import { resolveProductImageUrl } from '@/lib/catalog/resolve-product-image';
import { sanitizeProductImageUrl } from '@/lib/utils/product-image-url';

type CatalogSource = 'user_scan' | 'name_search';

export function normalizeAnalysisResult(result: AnalysisResult): AnalysisResult {
  let next = result;
  if (result.healthier_alternative?.image_url) {
    const safe = sanitizeProductImageUrl(result.healthier_alternative.image_url);
    next = {
      ...next,
      healthier_alternative: { ...result.healthier_alternative, image_url: safe },
    };
  }
  if (result.image_url) {
    next = { ...next, image_url: sanitizeProductImageUrl(result.image_url) };
  }
  return next;
}

async function attachProductImage(
  result: AnalysisResult,
  options: { brand?: string; source: CatalogSource; searchQuery?: string }
): Promise<AnalysisResult> {
  if (result.image_url) return result;

  if (options.source === 'name_search') {
    const image_url = await resolveProductImageFromGoogle({
      product_name: result.product_name,
      brand: options.brand,
      search_query: options.searchQuery,
    });
    if (image_url) return { ...result, image_url };
  }

  const image_url = await resolveProductImageUrl({
    product_name: result.product_name,
    brand: options.brand,
  });
  return image_url ? { ...result, image_url } : result;
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
  options: { source: CatalogSource; imageHash?: string; brand?: string; searchQuery?: string }
): Promise<AnalysisResult> {
  const lookupKey = makeCatalogLookupKey(visionData.product_name);
  let cached = await resolveCachedAnalysis(visionData.product_name);

  if (cached) {
    const storedInci = await getCatalogStoredIngredients(lookupKey);
    if (
      storedInci &&
      !ingredientsMatchForCache(storedInci, visionData.ingredients)
    ) {
      console.log(
        'Catalog cache skipped — stored INCI does not match current list:',
        lookupKey
      );
      cached = null;
    }
  }

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

  const withAlternative = await applyCatalogScoredAlternative(openai, analysisResult);
  return normalizeAnalysisResult(
    await attachProductImage(withAlternative, {
      brand: options.brand,
      source: options.source,
      searchQuery: options.searchQuery,
    })
  );
}
