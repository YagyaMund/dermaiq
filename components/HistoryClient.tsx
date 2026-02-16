'use client';

import { useState } from 'react';
import Link from 'next/link';

interface IngredientItem {
  name: string;
  benefit?: string;
  concern?: string;
}

interface IngredientCategory {
  category: string;
  items: IngredientItem[];
}

interface HistoryItem {
  id: string;
  productName: string;
  score: number;
  createdAt: string;
  positiveIngredients: unknown;
  negativeIngredients: unknown;
  verdict: string;
}

interface Props {
  history: HistoryItem[];
  userName: string;
}

function flattenIngredients(data: unknown): IngredientItem[] {
  if (!Array.isArray(data)) return [];
  if (data.length === 0) return [];
  if (data[0] && typeof data[0] === 'object' && 'category' in data[0] && 'items' in data[0]) {
    return (data as IngredientCategory[]).flatMap((g) => g.items);
  }
  return data as IngredientItem[];
}

export default function HistoryClient({ history, userName }: Props) {
  const [selectedItem, setSelectedItem] = useState<HistoryItem | null>(null);

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
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {userName}
          </span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
            Analysis History
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {history.length} product{history.length !== 1 ? 's' : ''} analyzed
          </p>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🔬</div>
            <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              No analyses yet
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Start analyzing products to see your history here
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
          <div className="space-y-3">
            {history.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItem(item)}
                className="w-full bg-white border rounded-lg p-4 text-left hover:shadow-md transition-all flex items-center gap-4"
                style={{ borderColor: 'var(--border)' }}
              >
                {/* Score Circle */}
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center border-3 flex-shrink-0"
                  style={{
                    borderWidth: '3px',
                    borderColor: getScoreColor(item.score),
                    backgroundColor: getScoreBg(item.score),
                  }}
                >
                  <span className="text-lg font-bold" style={{ color: getScoreColor(item.score) }}>
                    {item.score}
                  </span>
                </div>
                {/* Product Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm line-clamp-1" style={{ color: 'var(--text-primary)' }}>
                    {item.productName}
                  </h3>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {formatDate(item.createdAt)}
                  </p>
                  <span
                    className="inline-block text-xs px-2 py-0.5 rounded-full mt-1.5 font-medium"
                    style={{ backgroundColor: getScoreBg(item.score), color: getScoreColor(item.score) }}
                  >
                    {getScoreLabel(item.score)}
                  </span>
                </div>
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--text-secondary)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-lg w-full sm:max-w-lg max-h-[85vh] overflow-y-auto p-5 sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {selectedItem.productName}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  Analyzed {formatDate(selectedItem.createdAt)}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full ml-2"
                style={{ backgroundColor: 'var(--surface)' }}
              >
                <span style={{ color: 'var(--text-secondary)' }}>&times;</span>
              </button>
            </div>

            {/* Score */}
            <div className="flex items-center gap-4 mb-5 p-4 rounded-lg" style={{ backgroundColor: getScoreBg(selectedItem.score) }}>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center border-4 flex-shrink-0"
                style={{ borderColor: getScoreColor(selectedItem.score), backgroundColor: 'white' }}
              >
                <div className="text-center">
                  <span className="text-2xl font-bold block leading-none" style={{ color: getScoreColor(selectedItem.score) }}>
                    {selectedItem.score}
                  </span>
                  <span className="text-xs opacity-60" style={{ color: getScoreColor(selectedItem.score) }}>/100</span>
                </div>
              </div>
              <div>
                <p className="font-bold text-sm" style={{ color: getScoreColor(selectedItem.score) }}>
                  {getScoreLabel(selectedItem.score)}
                </p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  EU Penalty-Based Score
                </p>
              </div>
            </div>

            {/* Verdict */}
            <div className="mb-5 p-3 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
              <h3 className="font-semibold text-xs uppercase mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                Assessment
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {selectedItem.verdict}
              </p>
            </div>

            {/* Positives */}
            {(() => {
              const positives = flattenIngredients(selectedItem.positiveIngredients);
              return positives.length > 0 ? (
                <div className="mb-5">
                  <h3 className="font-semibold text-sm mb-2" style={{ color: '#4A7C59' }}>
                    What&apos;s Good In It
                  </h3>
                  <div className="space-y-1.5">
                    {positives.map((ingredient, idx) => (
                      <div key={idx} className="flex gap-2 p-2.5 rounded-lg" style={{ backgroundColor: '#F1F8E9' }}>
                        <span className="flex-shrink-0 text-sm" style={{ color: '#4A7C59' }}>✓</span>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{ingredient.name}</div>
                          {ingredient.benefit && (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{ingredient.benefit}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Negatives */}
            {(() => {
              const negatives = flattenIngredients(selectedItem.negativeIngredients);
              return negatives.length > 0 ? (
                <div>
                  <h3 className="font-semibold text-sm mb-2" style={{ color: '#B85C50' }}>
                    What to Watch Out For
                  </h3>
                  <div className="space-y-1.5">
                    {negatives.map((ingredient, idx) => (
                      <div key={idx} className="flex gap-2 p-2.5 rounded-lg" style={{ backgroundColor: '#FFF3E0' }}>
                        <span className="flex-shrink-0 text-sm" style={{ color: '#B85C50' }}>⚠</span>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{ingredient.name}</div>
                          {ingredient.concern && (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{ingredient.concern}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
