/**
 * Clears cached product scores so the next scan re-scores with current methodology.
 *
 * Run:
 *   npx tsx scripts/clear-product-catalog.ts
 *   npx tsx scripts/clear-product-catalog.ts --delete-rows
 *   npx tsx scripts/clear-product-catalog.ts --include-analyses
 */
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';

async function main() {
  const deleteRows = process.argv.includes('--delete-rows');
  const includeAnalyses = process.argv.includes('--include-analyses');

  if (deleteRows) {
    const deleted = await prisma.skincareProductCatalog.deleteMany();
    console.log(`Deleted ${deleted.count} skincare_product_catalog row(s).`);
  } else {
    const cleared = await prisma.skincareProductCatalog.updateMany({
      data: {
        analysisJson: Prisma.DbNull,
        score: null,
      },
    });
    console.log(
      `Cleared analysisJson + score on ${cleared.count} catalog row(s). INCI/lookup keys kept.`
    );
  }

  if (includeAnalyses) {
    const analyses = await prisma.analysis.deleteMany();
    console.log(`Deleted ${analyses.count} user analysis history row(s).`);
  }

  console.log('Done. New scans will score fresh and write catalog + history again.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
