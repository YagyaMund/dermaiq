import { Prisma, type Analysis } from '@prisma/client';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import RecommendationsClient from '@/components/RecommendationsClient';

export const dynamic = 'force-dynamic';

interface HealthierAlt {
  product_name: string;
  brand: string;
  estimated_score: number;
  reason: string;
}

export default async function RecommendationsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  const analyses = await prisma.analysis.findMany({
    where: {
      userId: session.user.id,
      healthierAlternative: { not: Prisma.DbNull },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  const recommendations = (analyses as Analysis[])
    .map((analysis) => {
      const alt = analysis.healthierAlternative as HealthierAlt | null;
      if (!alt?.product_name) return null;
      return {
        id: analysis.id,
        productName: analysis.productName,
        score: analysis.qualityScore,
        createdAt: analysis.createdAt.toISOString(),
        verdict: analysis.verdict,
        healthierAlternative: alt
          ? {
              product_name: alt.product_name,
              brand: alt.brand,
              estimated_score: alt.estimated_score,
              reason: alt.reason,
            }
          : null,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <RecommendationsClient
      recommendations={recommendations}
      userName={session.user.name || 'User'}
    />
  );
}
