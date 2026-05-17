import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AnalysisResult, VisionExtractionResult } from '@/types';
import { ScoringResultSchema } from '@/lib/analysis/scoring-schema';

function analysisForStorage(analysis: AnalysisResult): Omit<AnalysisResult, 'from_catalog_cache'> {
  const { from_catalog_cache: _omit, ...rest } = analysis;
  return rest;
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
  source: 'user_scan' | 'open_beauty_facts' | 'backfill' | 'alternative_suggestion';
  externalId?: string | null;
  imageHash?: string;
}): Promise<void> {
  const { lookupKey, vision, analysis, source, externalId } = params;
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

    await prisma.skincareProductCatalog.upsert({
      where: { lookupKey },
      create: {
        lookupKey,
        ...payload,
        ...(externalId != null && externalId !== '' ? { externalId } : {}),
        ...(params.imageHash ? { imageHash: params.imageHash } : {}),
      },
      update: {
        displayName: payload.displayName,
        productType: payload.productType,
        ingredients: payload.ingredients,
        source: payload.source,
        ...(externalId != null && externalId !== '' ? { externalId } : {}),
        ...(params.imageHash ? { imageHash: params.imageHash } : {}),
        ...(hasStoredScore
          ? {}
          : {
              analysisJson: payload.analysisJson,
              score: payload.score,
            }),
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
