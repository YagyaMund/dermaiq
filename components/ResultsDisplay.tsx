'use client';

import { useState } from 'react';
import type { AnalysisResult, IngredientCategory } from '@/types';

interface ResultsDisplayProps {
  result: AnalysisResult;
}

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  const [showIngredients, setShowIngredients] = useState(false);

  // Yuka-style bands: red < 25, orange < 50, then fair/good/excellent
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

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Product Name & Score */}
      <div className="bg-white rounded-lg border p-4 sm:p-6" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {result.product_name}
            </h2>
            <p className="text-xs sm:text-sm capitalize mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              {result.product_type?.replace(/_/g, ' ') || 'Cosmetic Product'}
            </p>
          </div>
          <div className="flex-shrink-0 text-center ml-3">
            <div
              className="w-18 h-18 sm:w-22 sm:h-22 rounded-full flex items-center justify-center border-4"
              style={{
                width: '76px',
                height: '76px',
                borderColor: getScoreColor(score),
                backgroundColor: getScoreBg(score),
              }}
            >
              <div>
                <span className="text-2xl sm:text-3xl font-bold block leading-none" style={{ color: getScoreColor(score) }}>
                  {score}
                </span>
                <span className="text-xs opacity-60" style={{ color: getScoreColor(score) }}>/100</span>
              </div>
            </div>
            <p className="text-xs font-bold mt-1.5" style={{ color: getScoreColor(score) }}>
              {getScoreLabel(score)}
            </p>
          </div>
        </div>

        {/* Score Range Guide (Yuka-style: red <25, orange <50, green 50-100) */}
        <div className="rounded-lg p-3 mt-4" style={{ backgroundColor: '#F9F7F4' }}>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5 mb-2">
            <div className="flex-1 rounded-l-full relative" style={{ backgroundColor: '#B85C50' }}>
              {score >= 0 && score < 25 && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border-2" style={{ borderColor: '#B85C50', left: `${(score / 25) * 100}%` }}></div>
              )}
            </div>
            <div className="flex-1 relative" style={{ backgroundColor: '#C07040' }}>
              {score >= 25 && score < 50 && (
                <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border-2" style={{ borderColor: '#C07040', left: `${((score - 25) / 25) * 100}%` }}></div>
              )}
            </div>
            <div className="flex-1 relative" style={{ backgroundColor: '#D4A574' }}>
              {score >= 50 && score < 65 && (
                <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border-2" style={{ borderColor: '#D4A574', left: `${((score - 50) / 15) * 100}%` }}></div>
              )}
            </div>
            <div className="flex-1 relative" style={{ backgroundColor: '#4A7C59' }}>
              {score >= 65 && score < 80 && (
                <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border-2" style={{ borderColor: '#4A7C59', left: `${((score - 65) / 15) * 100}%` }}></div>
              )}
            </div>
            <div className="flex-1 rounded-r-full relative" style={{ backgroundColor: '#2D6A4F' }}>
              {score >= 80 && (
                <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full border-2" style={{ borderColor: '#2D6A4F', left: `${((score - 80) / 20) * 100}%` }}></div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>Very Poor</span>
            <span>Poor</span>
            <span>Fair</span>
            <span>Good</span>
            <span>Excellent</span>
          </div>
        </div>

        <div className="rounded p-2.5 mt-3 text-xs leading-relaxed" style={{ backgroundColor: '#F5F1EB', color: 'var(--text-secondary)' }}>
          Score based on highest-risk ingredient (Yuka-style: red &lt;25, orange &lt;50, green 50–100)
        </div>
      </div>

      {/* Verdict */}
      <div className="bg-white rounded-lg border p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-xs sm:text-sm font-bold uppercase mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
          Overall Assessment
        </h3>
        <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {result.verdict}
        </p>
      </div>

      {/* Healthier Alternative */}
      {result.healthier_alternative && (
        <div className="bg-white rounded-lg border p-4 sm:p-5" style={{ borderColor: '#4A7C59', borderWidth: '2px' }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💚</span>
            <h3 className="text-sm sm:text-base font-bold" style={{ color: '#4A7C59' }}>
              Healthier Alternative
            </h3>
          </div>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="font-semibold text-sm sm:text-base" style={{ color: 'var(--text-primary)' }}>
                {result.healthier_alternative.product_name}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                by {result.healthier_alternative.brand}
              </p>
              <p className="text-xs sm:text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {result.healthier_alternative.reason}
              </p>
            </div>
            <div className="flex-shrink-0 text-center ml-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center border-3"
                style={{
                  borderColor: getScoreColor(result.healthier_alternative.estimated_score),
                  backgroundColor: getScoreBg(result.healthier_alternative.estimated_score),
                  borderWidth: '3px',
                }}
              >
                <span className="text-base font-bold" style={{ color: getScoreColor(result.healthier_alternative.estimated_score) }}>
                  {result.healthier_alternative.estimated_score}
                </span>
              </div>
              <p className="text-xs font-medium mt-1" style={{ color: getScoreColor(result.healthier_alternative.estimated_score) }}>
                est.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detected Ingredients (Collapsible) */}
      {result.detected_ingredients && result.detected_ingredients.length > 0 && (
        <div className="bg-white rounded-lg border p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
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
        <div className="bg-white rounded-lg border p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
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
        <div className="bg-white rounded-lg border p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
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
