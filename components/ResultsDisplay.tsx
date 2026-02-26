'use client';

import { useState } from 'react';
import type { AnalysisResult, IngredientCategory } from '@/types';

interface ResultsDisplayProps {
  result: AnalysisResult;
}

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  const [showIngredients, setShowIngredients] = useState(false);

  // Risk-based bands: red < 25, orange < 50, then fair/good/excellent
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#2D6A4F';
    if (score >= 65) return '#4A7C59';
    if (score >= 50) return '#D4A574';
    if (score >= 25) return '#C07040';
    return '#B85C50';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Excellent';
    if (score >= 65) return 'Good';
    if (score >= 50) return 'Fair';
    if (score >= 25) return 'Poor';
    return 'Very Poor';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 80) return '#E8F5E9';
    if (score >= 65) return '#F1F8E9';
    if (score >= 50) return '#FFF8E1';
    if (score >= 25) return '#FFF3E0';
    return '#FFEBEE';
  };

  const getRiskBadge = (level?: string) => {
    if (!level) return null;
    const config: Record<string, { bg: string; color: string; label: string }> = {
      green: { bg: '#E8F5E9', color: '#2D6A4F', label: 'Safe' },
      yellow: { bg: '#FFF8E1', color: '#F9A825', label: 'Low Risk' },
      orange: { bg: '#FFF3E0', color: '#E65100', label: 'Moderate' },
      red: { bg: '#FFEBEE', color: '#C62828', label: 'Hazardous' },
    };
    const c = config[level];
    if (!c) return null;
    return (
      <span
        className="inline-block text-xs px-2 py-0.5 rounded-full font-medium ml-2"
        style={{ backgroundColor: c.bg, color: c.color }}
      >
        {c.label}
      </span>
    );
  };

  const getCategoryIcon = (category: string): string => {
    const lower = category.toLowerCase();
    if (lower.includes('moistur') || lower.includes('hydrat')) return '💧';
    if (lower.includes('vitamin') || lower.includes('antioxid')) return '🍊';
    if (lower.includes('sooth') || lower.includes('calm')) return '🌿';
    if (lower.includes('natural') || lower.includes('extract') || lower.includes('oil')) return '🌱';
    if (lower.includes('sun') || lower.includes('uv')) return '☀️';
    if (lower.includes('repair')) return '🔧';
    if (lower.includes('fragranc') || lower.includes('scent')) return '🌸';
    if (lower.includes('preserv') || lower.includes('stabil')) return '🧪';
    if (lower.includes('sulfat') || lower.includes('cleans')) return '🫧';
    if (lower.includes('allergen')) return '⚠️';
    if (lower.includes('silicon') || lower.includes('film')) return '🔬';
    if (lower.includes('color') || lower.includes('dye')) return '🎨';
    if (lower.includes('ph') || lower.includes('buffer')) return '⚖️';
    return '📋';
  };

  const score = result.score;

  // Grading scale: bands 0–24 (25%), 25–49 (25%), 50–64 (15%), 65–79 (15%), 80–100 (20%)
  const scaleSegments = [
    { width: 25, color: '#B85C50', label: 'Very Poor' },
    { width: 25, color: '#C07040', label: 'Poor' },
    { width: 15, color: '#D4A574', label: 'Fair' },
    { width: 15, color: '#4A7C59', label: 'Good' },
    { width: 20, color: '#2D6A4F', label: 'Excellent' },
  ];
  const scorePositionPercent = Math.min(100, Math.max(0, (score / 100) * 100));

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Product Name & Score */}
      <div className="bg-white rounded-xl border-2 shadow-sm p-5 sm:p-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {result.product_name}
            </h2>
            <p className="text-xs sm:text-sm capitalize mt-1 opacity-80" style={{ color: 'var(--text-secondary)' }}>
              {result.product_type?.replace(/_/g, ' ') || 'Cosmetic Product'}
            </p>
          </div>
          <div className="flex-shrink-0 text-center">
            <div
              className="rounded-full flex items-center justify-center border-4 shadow-inner"
              style={{
                width: '80px',
                height: '80px',
                borderColor: getScoreColor(score),
                backgroundColor: getScoreBg(score),
              }}
            >
              <span className="inline-flex items-baseline">
                <span className="text-2xl sm:text-3xl font-bold tabular-nums" style={{ color: getScoreColor(score) }}>{score}</span>
                <span className="text-sm opacity-70 ml-0.5" style={{ color: getScoreColor(score) }}>/100</span>
              </span>
            </div>
            <p className="text-xs font-semibold mt-2" style={{ color: getScoreColor(score) }}>
              {getScoreLabel(score)}
            </p>
          </div>
        </div>

        {/* Grading scale bar — segment widths match score bands (25, 25, 15, 15, 20) */}
        <div className="mt-5">
          <div className="rounded-xl p-3.5" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="relative flex h-4 rounded-full overflow-hidden" style={{ maxWidth: '100%' }}>
              {scaleSegments.map((seg, i) => (
                <div
                  key={i}
                  className="h-full first:rounded-l-full last:rounded-r-full"
                  style={{ width: `${seg.width}%`, backgroundColor: seg.color }}
                />
              ))}
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full border-2 shadow-md pointer-events-none"
                style={{ left: `calc(${scorePositionPercent}% - 6px)`, borderColor: getScoreColor(score), minWidth: '12px', minHeight: '12px' }}
                aria-hidden
              />
            </div>
            <div className="flex justify-between text-xs mt-2 gap-1" style={{ color: 'var(--text-secondary)' }}>
              {scaleSegments.map((seg, i) => (
                <span key={i} className="flex-1 text-center font-medium">{seg.label}</span>
              ))}
            </div>
          </div>
          <p className="text-xs mt-2.5 opacity-80" style={{ color: 'var(--text-secondary)' }}>
            Score based on highest-risk ingredient: red &lt;25, orange &lt;50, green 50–100
          </p>
        </div>
      </div>

      {/* Verdict */}
      <div className="bg-white rounded-xl border-2 shadow-sm p-5 sm:p-6" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider mb-3 opacity-90" style={{ color: 'var(--text-secondary)' }}>
          Overall Assessment
        </h3>
        <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {result.verdict}
        </p>
      </div>

      {/* Healthier Alternative */}
      {result.healthier_alternative && (() => {
        const alt = result.healthier_alternative;
        const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(alt.product_name + ' ' + alt.brand)}`;
        return (
          <div className="bg-white rounded-xl border-2 shadow-sm overflow-hidden" style={{ borderColor: '#4A7C59' }}>
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl" aria-hidden>💚</span>
                <h3 className="text-base sm:text-lg font-bold" style={{ color: '#4A7C59' }}>
                  Healthier Alternative
                </h3>
              </div>
              <div className="flex gap-4 sm:gap-5">
                {/* Product image or placeholder */}
                <div className="flex-shrink-0 w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center" style={{ backgroundColor: 'var(--surface)' }}>
                  {alt.image_url && (alt.image_url.startsWith('http://') || alt.image_url.startsWith('https://')) ? (
                    <img
                      src={alt.image_url}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-3xl sm:text-4xl opacity-40" aria-hidden>🧴</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                    {alt.product_name}
                  </p>
                  <p className="text-xs mt-0.5 opacity-80" style={{ color: 'var(--text-secondary)' }}>
                    by {alt.brand}
                  </p>
                  <p className="text-xs sm:text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {alt.reason}
                  </p>
                  <a
                    href={googleSearchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium rounded-lg px-3 py-1.5 transition opacity-90 hover:opacity-100"
                    style={{ color: '#4A7C59', backgroundColor: 'rgba(74, 124, 89, 0.12)' }}
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    Search on Google
                  </a>
                </div>
                <div className="flex-shrink-0 text-center">
                  <div
                    className="w-14 h-14 rounded-full flex flex-col items-center justify-center border-2"
                    style={{
                      borderColor: getScoreColor(alt.estimated_score),
                      backgroundColor: getScoreBg(alt.estimated_score),
                    }}
                  >
                    <span className="text-lg font-bold" style={{ color: getScoreColor(alt.estimated_score) }}>
                      {alt.estimated_score}
                    </span>
                    <span className="text-[10px] font-medium opacity-80" style={{ color: getScoreColor(alt.estimated_score) }}>
                      est.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Detected Ingredients (Collapsible) */}
      {result.detected_ingredients && result.detected_ingredients.length > 0 && (
        <div className="bg-white rounded-xl border-2 shadow-sm p-5 sm:p-6" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setShowIngredients(!showIngredients)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="text-xs sm:text-sm font-bold uppercase" style={{ color: 'var(--text-secondary)' }}>
              Detected Ingredients ({result.detected_ingredients.length})
            </h3>
            <svg
              className={`w-4 h-4 transition-transform ${showIngredients ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--text-secondary)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showIngredients && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {result.detected_ingredients.map((ingredient, index) => (
                <span
                  key={index}
                  className="inline-block text-xs px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: '#F5F1EB', color: 'var(--text-primary)' }}
                >
                  {ingredient}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Positive Ingredients */}
      {result.positive_ingredients.length > 0 && (
        <div className="bg-white rounded-xl border-2 shadow-sm p-5 sm:p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0" style={{ backgroundColor: '#4A7C59' }}>
              ✓
            </div>
            <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              What&apos;s Good In It
            </h3>
          </div>
          <div className="space-y-4">
            {result.positive_ingredients.map((group: IngredientCategory, groupIndex: number) => (
              <div key={groupIndex}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{getCategoryIcon(group.category)}</span>
                  <h4 className="text-sm font-semibold" style={{ color: '#4A7C59' }}>
                    {group.category}
                  </h4>
                </div>
                <div className="space-y-2 pl-7">
                  {group.items.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center flex-wrap">
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {item.name}
                        </span>
                        {getRiskBadge(item.risk_level)}
                      </div>
                      {item.benefit && (
                        <div className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {item.benefit}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negative Ingredients */}
      {result.negative_ingredients.length > 0 && (
        <div className="bg-white rounded-xl border-2 shadow-sm p-5 sm:p-6" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0" style={{ backgroundColor: '#B85C50' }}>
              !
            </div>
            <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              What to Watch Out For
            </h3>
          </div>
          <div className="space-y-4">
            {result.negative_ingredients.map((group: IngredientCategory, groupIndex: number) => (
              <div key={groupIndex}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{getCategoryIcon(group.category)}</span>
                  <h4 className="text-sm font-semibold" style={{ color: '#B85C50' }}>
                    {group.category}
                  </h4>
                </div>
                <div className="space-y-2 pl-7">
                  {group.items.map((item, index) => (
                    <div key={index}>
                      <div className="flex items-center flex-wrap">
                        <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                          {item.name}
                        </span>
                        {getRiskBadge(item.risk_level)}
                      </div>
                      {item.concern && (
                        <div className="text-xs leading-relaxed mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {item.concern}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
