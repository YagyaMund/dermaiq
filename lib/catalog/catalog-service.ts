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
  source: 'user_scan' | 'open_beauty_facts' | 'backfill';
  externalId?: string | null;
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
    await prisma.skincareProductCatalog.upsert({
      where: { lookupKey },
      create: {
        lookupKey,
        ...payload,
        ...(externalId != null && externalId !== '' ? { externalId } : {}),
      },
      update: {
        ...payload,
        ...(externalId != null && externalId !== '' ? { externalId } : {}),
      },
    });
  } catch (e) {
    console.warn('Catalog upsert failed (response still returned):', e);
  }
}
