import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import HistoryClient from '@/components/HistoryClient';

export default async function HistoryPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect('/login');
  }

  // Fetch user's analysis history
  const analyses = await prisma.analysis.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 50, // Limit to 50 most recent
  });

  // Transform data for client
  const historyData = analyses.map((analysis) => ({
    id: analysis.id,
    productName: analysis.productName,
    qualityScore: analysis.qualityScore,
    safetyScore: analysis.safetyScore,
    organicType: analysis.organicType,
    createdAt: analysis.createdAt.toISOString(),
    positiveIngredients: analysis.positiveIngredients as Array<{ name: string; benefit: string }>,
    negativeIngredients: analysis.negativeIngredients as Array<{ name: string; concern: string }>,
    verdict: analysis.verdict,
  }));

  return <HistoryClient history={historyData} userName={session.user.name || 'User'} />;
}
