'use client';

import Link from 'next/link';

interface HealthierAlt {
  product_name: string;
  brand: string;
  estimated_score: number;
  reason: string;
}

interface RecommendationItem {
  id: string;
  productName: string;
  score: number;
  createdAt: string;
  verdict: string;
  healthierAlternative: HealthierAlt | null;
}

interface Props {
  recommendations: RecommendationItem[];
  userName: string;
}

export default function RecommendationsClient({ recommendations, userName }: Props) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#2D6A4F';
    if (score >= 60) return '#4A7C59';
    if (score >= 40) return '#D4A574';
    if (score >= 20) return '#C07040';
    return '#B85C50';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    if (score >= 20) return 'Poor';
    return 'Very Poor';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 80) return '#E8F5E9';
    if (score >= 60) return '#F1F8E9';
    if (score >= 40) return '#FFF8E1';
    if (score >= 20) return '#FFF3E0';
    return '#FFEBEE';
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
            DermaIQ
          </Link>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {userName}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Better Picks
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Healthier alternatives for your analyzed products
          </p>
        </div>

        {recommendations.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🌿</div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No recommendations yet
            </h2>
            <p className="text-sm mb-2 px-4" style={{ color: 'var(--text-secondary)' }}>
              When you scan products that score below Fair, we&apos;ll suggest healthier alternatives here.
            </p>
            <p className="text-xs mb-6 px-4" style={{ color: 'var(--text-secondary)' }}>
              Start by analyzing a product to see if there are better options!
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-lg text-white font-semibold text-sm"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Analyze a Product
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((item) => (
              <div
                key={item.id}
                className="bg-white border rounded-lg overflow-hidden"
                style={{ borderColor: 'var(--border)' }}
              >
                {/* Header */}
                <div className="px-4 pt-4 pb-2">
                  <p className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>
                    Swap Suggestion
                  </p>
                </div>

                {/* 2-Column Grid */}
                <div className="grid grid-cols-2 gap-0">
                  {/* Left: Your Product */}
                  <div className="p-4 border-r" style={{ borderColor: 'var(--border)', backgroundColor: getScoreBg(item.score) }}>
                    <p className="text-xs font-semibold uppercase mb-3" style={{ color: '#B85C50' }}>
                      Your Product
                    </p>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center border-3 mx-auto mb-2"
                      style={{
                        borderWidth: '3px',
                        borderColor: getScoreColor(item.score),
                        backgroundColor: 'white',
                      }}
                    >
                      <span className="text-base font-bold" style={{ color: getScoreColor(item.score) }}>
                        {item.score}
                      </span>
                    </div>
                    <p className="text-xs text-center font-medium mb-2" style={{ color: getScoreColor(item.score) }}>
                      {getScoreLabel(item.score)}
                    </p>
                    <p className="text-sm font-semibold text-center line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                      {item.productName}
                    </p>
                  </div>

                  {/* Right: Healthier Alternative */}
                  <div className="p-4" style={{ backgroundColor: item.healthierAlternative ? '#F1F8E9' : 'var(--surface)' }}>
                    {item.healthierAlternative ? (
                      <>
                        <p className="text-xs font-semibold uppercase mb-3" style={{ color: '#4A7C59' }}>
                          Try Instead
                        </p>
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center border-3 mx-auto mb-2"
                          style={{
                            borderWidth: '3px',
                            borderColor: getScoreColor(item.healthierAlternative.estimated_score),
                            backgroundColor: 'white',
                          }}
                        >
                          <span className="text-base font-bold" style={{ color: getScoreColor(item.healthierAlternative.estimated_score) }}>
                            {item.healthierAlternative.estimated_score}
                          </span>
                        </div>
                        <p className="text-xs text-center font-medium mb-2" style={{ color: getScoreColor(item.healthierAlternative.estimated_score) }}>
                          {getScoreLabel(item.healthierAlternative.estimated_score)} (est.)
                        </p>
                        <p className="text-sm font-semibold text-center line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                          {item.healthierAlternative.product_name}
                        </p>
                        <p className="text-xs text-center mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          by {item.healthierAlternative.brand}
                        </p>
                      </>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>
                          No alternative found for this product
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Reason Footer */}
                {item.healthierAlternative && (
                  <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--border)', backgroundColor: '#FAFAF8' }}>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      <span className="font-medium" style={{ color: '#4A7C59' }}>Why switch?</span>{' '}
                      {item.healthierAlternative.reason}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
