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

  // Fetch analyses with score below Fair (<50) that have healthier alternatives
  const analyses = await prisma.analysis.findMany({
    where: {
      userId: session.user.id,
      qualityScore: {
        lt: 50,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 20,
  });

  const recommendations = analyses
    .map((analysis) => {
      const alt = analysis.healthierAlternative as HealthierAlt | null;
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
    });

  return (
    <RecommendationsClient
      recommendations={recommendations}
      userName={session.user.name || 'User'}
    />
  );
}
