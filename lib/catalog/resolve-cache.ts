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

/** Exact + variant lookup keys, then best fuzzy match on catalog display name. */
export async function resolveCachedAnalysis(productName: string): Promise<AnalysisResult | null> {
  for (const key of catalogLookupKeyVariants(productName)) {
    const hit = await findCachedSkincareAnalysis(key);
    if (hit) return hit;
  }

  const targetKey = makeCatalogLookupKey(productName);
  const brandToken = targetKey.split('-').filter(Boolean)[0];
  if (!brandToken || brandToken.length < 3) return null;

  try {
    const rows = await prisma.skincareProductCatalog.findMany({
      where: {
        analysisJson: { not: Prisma.DbNull },
        score: { not: null },
        lookupKey: { contains: brandToken },
      },
      take: 20,
    });

    let best: { key: string; json: unknown } | null = null;
    let bestScore = 0;

    for (const row of rows) {
      if (!row.analysisJson) continue;
      const a = row.lookupKey;
      const b = targetKey;
      const score = keySimilarity(a, b);
      if (score > bestScore && score >= 0.72) {
        bestScore = score;
        best = { key: row.lookupKey, json: row.analysisJson };
      }
    }

    if (best) return parseAnalysisJson(best.json);
  } catch (e) {
    console.warn('Fuzzy catalog lookup failed:', e);
  }

  return null;
}

function keySimilarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.9;
  const aParts = new Set(a.split('-').filter((p) => p.length > 2));
  const bParts = new Set(b.split('-').filter((p) => p.length > 2));
  if (aParts.size === 0 || bParts.size === 0) return 0;
  let overlap = 0;
  for (const p of aParts) {
    if (bParts.has(p)) overlap += 1;
  }
  return overlap / Math.max(aParts.size, bParts.size);
}
