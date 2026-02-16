'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';

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
  qualityScore: number;
  safetyScore: number;
  organicType: string;
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
  // Grouped format: [{category, items: [...]}]
  if (data[0] && typeof data[0] === 'object' && 'category' in data[0] && 'items' in data[0]) {
    return (data as IngredientCategory[]).flatMap((g) => g.items);
  }
  // Flat format: [{name, benefit/concern}]
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Analysis History
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {history.length} product{history.length !== 1 ? 's' : ''} analyzed
          </p>
        </div>

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
            {history.map((item) => {
              const overall = Math.round((item.qualityScore + item.safetyScore) / 2);
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className="bg-white border rounded-lg p-4 text-left hover:shadow-lg transition-all"
                  style={{ borderColor: 'var(--border)' }}
                >
                  <h3 className="font-semibold mb-2 line-clamp-2" style={{ color: 'var(--text-primary)' }}>
                    {item.productName}
                  </h3>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                    {formatDate(item.createdAt)}
                  </p>
                  <div className="flex gap-2 mb-3">
                    <div className="flex-1 text-center p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Quality</div>
                      <div className="text-lg font-bold" style={{ color: getScoreColor(item.qualityScore) }}>
                        {item.qualityScore}
                      </div>
                      <div className="text-xs" style={{ color: getScoreColor(item.qualityScore) }}>
                        {getScoreLabel(item.qualityScore)}
                      </div>
                    </div>
                    <div className="flex-1 text-center p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Safety</div>
                      <div className="text-lg font-bold" style={{ color: getScoreColor(item.safetyScore) }}>
                        {item.safetyScore}
                      </div>
                      <div className="text-xs" style={{ color: getScoreColor(item.safetyScore) }}>
                        {getScoreLabel(item.safetyScore)}
                      </div>
                    </div>
                    <div className="flex-1 text-center p-2 rounded" style={{ backgroundColor: 'var(--surface)' }}>
                      <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Overall</div>
                      <div className="text-lg font-bold" style={{ color: getScoreColor(overall) }}>
                        {overall}
                      </div>
                      <div className="text-xs" style={{ color: getScoreColor(overall) }}>
                        {getScoreLabel(overall)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs px-2 py-1 rounded inline-block" style={{
                    backgroundColor: item.organicType === 'Organic' ? '#E8F5E9' : '#FFEBEE',
                    color: item.organicType === 'Organic' ? '#2D6A4F' : '#B85C50',
                  }}>
                    {item.organicType}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSelectedItem(null)}
              className="float-right text-2xl"
              style={{ color: 'var(--text-secondary)' }}
            >
              &times;
            </button>

            <h2 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
              {selectedItem.productName}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
              Analyzed {formatDate(selectedItem.createdAt)}
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#F5F1EB' }}>
                <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Quality</div>
                <div className="text-3xl font-bold" style={{ color: getScoreColor(selectedItem.qualityScore) }}>
                  {selectedItem.qualityScore}
                </div>
                <div className="text-xs font-medium mt-1" style={{ color: getScoreColor(selectedItem.qualityScore) }}>
                  {getScoreLabel(selectedItem.qualityScore)}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#F5F1EB' }}>
                <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Safety</div>
                <div className="text-3xl font-bold" style={{ color: getScoreColor(selectedItem.safetyScore) }}>
                  {selectedItem.safetyScore}
                </div>
                <div className="text-xs font-medium mt-1" style={{ color: getScoreColor(selectedItem.safetyScore) }}>
                  {getScoreLabel(selectedItem.safetyScore)}
                </div>
              </div>
              <div className="text-center p-4 rounded-lg" style={{ backgroundColor: '#F5F1EB' }}>
                <div className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Type</div>
                <div className="text-sm font-semibold mt-2" style={{
                  color: selectedItem.organicType === 'Organic' ? '#2D6A4F' : '#B85C50',
                }}>
                  {selectedItem.organicType}
                </div>
              </div>
            </div>

            <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--surface)' }}>
              <h3 className="font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                Overall Assessment
              </h3>
              <p style={{ color: 'var(--text-secondary)' }}>{selectedItem.verdict}</p>
            </div>

            {(() => {
              const positives = flattenIngredients(selectedItem.positiveIngredients);
              return positives.length > 0 ? (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3" style={{ color: '#4A7C59' }}>
                    What&apos;s Good In It
                  </h3>
                  <div className="space-y-2">
                    {positives.map((ingredient, idx) => (
                      <div key={idx} className="flex gap-2 p-3 rounded-lg" style={{ backgroundColor: '#F1F8E9' }}>
                        <span className="flex-shrink-0" style={{ color: '#4A7C59' }}>✓</span>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                            {ingredient.name}
                          </div>
                          {ingredient.benefit && (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              {ingredient.benefit}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {(() => {
              const negatives = flattenIngredients(selectedItem.negativeIngredients);
              return negatives.length > 0 ? (
                <div>
                  <h3 className="font-semibold mb-3" style={{ color: '#B85C50' }}>
                    What to Watch Out For
                  </h3>
                  <div className="space-y-2">
                    {negatives.map((ingredient, idx) => (
                      <div key={idx} className="flex gap-2 p-3 rounded-lg" style={{ backgroundColor: '#FFF3E0' }}>
                        <span className="flex-shrink-0" style={{ color: '#B85C50' }}>⚠</span>
                        <div>
                          <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                            {ingredient.name}
                          </div>
                          {ingredient.concern && (
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                              {ingredient.concern}
                            </div>
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
