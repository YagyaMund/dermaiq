/**
 * Scores catalog rows that have ingredients but no analysisJson (Open Beauty Facts seed, etc.).
 *
 * Run: npx tsx scripts/backfill-catalog-scores.ts --limit=20
 * Requires: DATABASE_URL, OPENAI_API_KEY
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { VisionExtractionResult } from '../types';
import { scoreSkincareFromVisionWithDefaultClient } from '../lib/analysis/score-from-vision';
import { SKINCARE_PRODUCT_TYPES, type SkincareProductType } from '../lib/prompts/vision-skincare';

function argLimit(): number {
  const m = process.argv.find((a) => a.startsWith('--limit='));
  if (!m) return 10;
  const n = parseInt(m.split('=')[1] || '10', 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, 200) : 10;
}

async function main() {
  const limit = argLimit();
  const rows = await prisma.skincareProductCatalog.findMany({
    where: {
      analysisJson: { equals: Prisma.DbNull },
    },
    take: limit,
    orderBy: { createdAt: 'asc' },
  });

  if (rows.length === 0) {
    console.log('No rows to backfill (all scored or empty ingredients).');
    return;
  }

  console.log(`Backfilling ${rows.length} catalog row(s)...`);

  const allowed = new Set<string>(
    SKINCARE_PRODUCT_TYPES.filter((t) => t !== 'not_skincare') as string[]
  );

  for (const row of rows) {
    const ingredients = row.ingredients as unknown as string[];
    if (!Array.isArray(ingredients) || ingredients.length === 0) continue;

    const pt: SkincareProductType = allowed.has(row.productType)
      ? (row.productType as SkincareProductType)
      : 'moisturizer';

    const vision: VisionExtractionResult = {
      product_name: row.displayName,
      product_type: pt,
      ingredients,
      confidence: 'high',
      is_skincare: true,
    };

    try {
      const analysis = await scoreSkincareFromVisionWithDefaultClient(vision);
      const { from_catalog_cache: _f, ...stored } = analysis;

      await prisma.skincareProductCatalog.update({
        where: { id: row.id },
        data: {
          analysisJson: JSON.parse(JSON.stringify(stored)) as Prisma.InputJsonValue,
          score: analysis.score,
          productType: analysis.product_type,
          source: 'backfill',
        },
      });
      console.log('Scored:', row.displayName, '→', analysis.score);
    } catch (e) {
      console.error('Failed row', row.id, row.displayName, e);
    }

    await new Promise((r) => setTimeout(r, 400));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
