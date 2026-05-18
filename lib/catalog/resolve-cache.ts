import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { AnalysisResult } from '@/types';
import { ScoringResultSchema } from '@/lib/analysis/scoring-schema';
import { makeCatalogLookupKey } from './lookup-key';
import { findCachedSkincareAnalysis } from './catalog-service';

const STRIP_WORDS =
  /\b(facial|face|body|for|the|with|and|new|improved|professional|intensive|daily|original|formula)\b/gi;

export function catalogLookupKeyVariants(productName: string): string[] {
  const keys = new Set<string>();
  const primary = makeCatalogLookupKey(productName);
  keys.add(primary);

  const stripped = productName.replace(STRIP_WORDS, ' ').replace(/\s+/g, ' ').trim();
  if (stripped) keys.add(makeCatalogLookupKey(stripped));

  return [...keys];
}

function parseAnalysisJson(json: unknown): AnalysisResult | null {
  const parsed = ScoringResultSchema.safeParse(json);
  if (!parsed.success) return null;
  return { ...parsed.data, from_catalog_cache: true };
}

export async function findCachedByImageHash(imageHash: string): Promise<AnalysisResult | null> {
  try {
    const row = await prisma.skincareProductCatalog.findUnique({
      where: { imageHash },
    });
    if (!row?.analysisJson) return null;
    return parseAnalysisJson(row.analysisJson);
  } catch {
    return null;
  }
}

/** Exact lookup key variants only — no fuzzy match (avoids wrong product formulas). */
export async function resolveCachedAnalysis(productName: string): Promise<AnalysisResult | null> {
  for (const key of catalogLookupKeyVariants(productName)) {
    const hit = await findCachedSkincareAnalysis(key);
    if (hit) return hit;
  }
  return null;
}
