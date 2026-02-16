'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

interface HistoryItem {
  id: string;
  productName: string;
  qualityScore: number;
  safetyScore: number;
  organicType: string;
  createdAt: string;
  positiveIngredients: Array<{ name: string; benefit: string }>;
  negativeIngredients: Array<{ name: string; concern: string }>;
  verdict: string;
}

interface Props {
  history: HistoryItem[];
  userName: string;
}

export default function HistoryClient({ history, userName }: Props) {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

  const getScoreColor = (score: number) => {
    if (score >= 75) return '#4F7C5E';
    if (score >= 50) return '#B8860B';
    return '#B85C50';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'white' }}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold" style={{ color: 'var(--primary)' }}>
            DermaIQ
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {userName}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="text-sm px-4 py-2 rounded-lg border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Analysis History
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {history.length} product{history.length !== 1 ? 's' : ''} analyzed
          </p>
        </div>

        {/* Empty State */}
        {history.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔬</div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No analyses yet
            </h2>
            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              Start analyzing products to see your history here
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 rounded-lg text-white font-semibold"
              style={{ backgroundColor: 'var(--primary)' }}
            >
              Analyze a Product
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="bg-white border rounded-lg p-4 text-left hover:shadow-lg transition-all"
                style={{ borderColor: 'var(--border)' }}
              >
                {/* Product Name */}
                <h3 className="font-semibold mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                  {item.productName}
                </h3>

                {/* Date */}
                <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {formatDate(item.createdAt)}
                </p>

                {/* Scores */}
                <div className="flex gap-2 mb-3">
                  <div className="flex-1 text-center p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Quality
                    </div>
                    <div className="text-lg font-bold" style={{ color: getScoreColor(item.qualityScore) }}>
                      {item.qualityScore}
                    </div>
                  </div>
                  <div className="flex-1 text-center p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Safety
                    </div>
                    <div className="text-lg font-bold" style={{ color: getScoreColor(item.safetyScore) }}>
                      {item.safetyScore}
                    </div>
                  </div>
                </div>

                {/* Organic Type */}
                <div className="text-xs px-2 py-1 rounded inline-block" style={{ backgroundColor: 'var(--surface)', color: 'var(--text-secondary)' }}>
                  {item.organicType}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modal for detailed view */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setSelectedItem(null)}
              className="float-right text-2xl"
              style={{ color: 'var(--text-secondary)' }}
            >
              ×
            </button>

            {/* Product Name */}
            <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              {selectedItem.productName}
            </h2>

            {/* Date */}
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Analyzed {formatDate(selectedItem.createdAt)}
            </p>

            {/* Scores */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, #F5E6D3 0%, #E8D4BA 100%)' }}>
                <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Quality</div>
                <div className="text-3xl font-bold" style={{ color: getScoreColor(selectedItem.qualityScore) }}>
                  {selectedItem.qualityScore}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, #E8D4BA 0%, #DCC5A8 100%)' }}>
                <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Safety</div>
                <div className="text-3xl font-bold" style={{ color: getScoreColor(selectedItem.safetyScore) }}>
                  {selectedItem.safetyScore}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ background: 'linear-gradient(135deg, #DCC5A8 0%, #D0B696 100%)' }}>
                <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Type</div>
                <div className="text-sm font-semibold mt-2" style={{ color: 'var(--primary)' }}>
                  {selectedItem.organicType}
                </div>
              </div>
            </div>

            {/* Verdict */}
            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Overall Verdict
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>{selectedItem.verdict}</p>
            </div>

            {/* Good Ingredients */}
            {selectedItem.positiveIngredients.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Good Ingredients
                </h3>
                <div className="space-y-2">
                  {selectedItem.positiveIngredients.map((ingredient, idx) => (
                    <div key={idx} className="flex gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
                      <span className="text-green-600 flex-shrink-0">✓</span>
                      <div>
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {ingredient.name}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {ingredient.benefit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Watch Out For */}
            {selectedItem.negativeIngredients.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Ingredients to Watch Out For
                </h3>
                <div className="space-y-2">
                  {selectedItem.negativeIngredients.map((ingredient, idx) => (
                    <div key={idx} className="flex gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
                      <span className="text-orange-600 flex-shrink-0">⚠</span>
                      <div>
                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {ingredient.name}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                          {ingredient.concern}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
