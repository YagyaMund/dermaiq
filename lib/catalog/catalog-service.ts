import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AnalysisResult, VisionExtractionResult } from '@/types';
import { ScoringResultSchema } from '@/lib/analysis/scoring-schema';

function analysisForStorage(analysis: AnalysisResult): Omit<AnalysisResult, 'from_catalog_cache'> {
  const { from_catalog_cache: _omit, ...rest } = analysis;
  return rest;
}

export async function getCatalogStoredIngredients(
  lookupKey: string
): Promise<string[] | null> {
  try {
    const row = await prisma.skincareProductCatalog.findUnique({
      where: { lookupKey },
      select: { ingredients: true },
    });
    if (!row?.ingredients || !Array.isArray(row.ingredients)) return null;
    return row.ingredients.filter((x): x is string => typeof x === 'string');
  } catch {
    return null;
  }
}

export async function findCachedSkincareAnalysis(
  lookupKey: string
): Promise<AnalysisResult | null> {
  try {
    const row = await prisma.skincareProductCatalog.findUnique({
      where: { lookupKey },
    });
    if (!row?.analysisJson) {
      return null;
    }
    const parsed = ScoringResultSchema.safeParse(row.analysisJson);
    if (!parsed.success) {
      return null;
    }
    return { ...parsed.data, from_catalog_cache: true };
  } catch (e) {
    console.warn('Catalog cache read failed (continuing without cache):', e);
    return null;
  }
}

export async function upsertSkincareCatalogEntry(params: {
  lookupKey: string;
  vision: VisionExtractionResult;
  analysis: AnalysisResult;
  source: 'user_scan' | 'name_search' | 'backfill' | 'alternative_suggestion';
  imageHash?: string;
}): Promise<void> {
  const { lookupKey, vision, analysis, source } = params;
  const stored = analysisForStorage(analysis);
  const payload = {
    displayName: vision.product_name,
    productType: analysis.product_type,
    ingredients: vision.ingredients as unknown as Prisma.InputJsonValue,
    analysisJson: JSON.parse(JSON.stringify(stored)) as Prisma.InputJsonValue,
    score: analysis.score,
    source,
  };

  try {
    const existing = await prisma.skincareProductCatalog.findUnique({
      where: { lookupKey },
      select: { analysisJson: true, score: true },
    });

    const hasStoredScore = existing?.analysisJson != null && existing?.score != null;
    const refreshScore =
      source === 'user_scan' || source === 'name_search' || !hasStoredScore;

    await prisma.skincareProductCatalog.upsert({
      where: { lookupKey },
      create: {
        lookupKey,
        ...payload,
        ...(params.imageHash ? { imageHash: params.imageHash } : {}),
      },
      update: {
        displayName: payload.displayName,
        productType: payload.productType,
        ingredients: payload.ingredients,
        source: payload.source,
        ...(params.imageHash ? { imageHash: params.imageHash } : {}),
        ...(refreshScore
          ? {
              analysisJson: payload.analysisJson,
              score: payload.score,
            }
          : {}),
      },
    });
  } catch (e) {
    console.warn('Catalog upsert failed (response still returned):', e);
  }
}

export async function linkImageHashToCatalog(
  lookupKey: string,
  imageHash: string
): Promise<void> {
  try {
    await prisma.skincareProductCatalog.updateMany({
      where: { lookupKey, imageHash: null },
      data: { imageHash },
    });
  } catch (e) {
    console.warn('linkImageHashToCatalog failed:', e);
  }
}
