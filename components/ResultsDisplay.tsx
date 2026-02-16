'use client';

import { useState } from 'react';
import type { AnalysisResult, IngredientCategory } from '@/types';

interface ResultsDisplayProps {
  result: AnalysisResult;
}

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  const [showIngredients, setShowIngredients] = useState(false);

  const getScoreColor = (score: number): string => {
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

  const getOverallScore = Math.round((result.scores.quality + result.scores.safety) / 2);

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
    if (lower.includes('synthetic') || lower.includes('chemical')) return '⚗️';
    if (lower.includes('allergen')) return '⚠️';
    if (lower.includes('silicon') || lower.includes('film')) return '🔬';
    if (lower.includes('color') || lower.includes('dye')) return '🎨';
    if (lower.includes('ph') || lower.includes('buffer')) return '⚖️';
    return '📋';
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Product Name & Overall Score */}
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
              className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border-4"
              style={{
                borderColor: getScoreColor(getOverallScore),
                backgroundColor: getScoreBg(getOverallScore),
              }}
            >
              <span className="text-xl sm:text-2xl font-bold" style={{ color: getScoreColor(getOverallScore) }}>
                {getOverallScore}
              </span>
            </div>
            <p className="text-xs font-semibold mt-1" style={{ color: getScoreColor(getOverallScore) }}>
              {getScoreLabel(getOverallScore)}
            </p>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4 mb-4">
          {/* Quality */}
          <div className="text-center p-3 rounded-lg" style={{ backgroundColor: getScoreBg(result.scores.quality) }}>
            <div className="text-2xl sm:text-3xl font-bold" style={{ color: getScoreColor(result.scores.quality) }}>
              {result.scores.quality}
            </div>
            <div className="text-xs uppercase font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Quality
            </div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: getScoreColor(result.scores.quality) }}>
              {getScoreLabel(result.scores.quality)}
            </div>
          </div>

          {/* Safety */}
          <div className="text-center p-3 rounded-lg" style={{ backgroundColor: getScoreBg(result.scores.safety) }}>
            <div className="text-2xl sm:text-3xl font-bold" style={{ color: getScoreColor(result.scores.safety) }}>
              {result.scores.safety}
            </div>
            <div className="text-xs uppercase font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Safety
            </div>
            <div className="text-xs font-semibold mt-0.5" style={{ color: getScoreColor(result.scores.safety) }}>
              {getScoreLabel(result.scores.safety)}
            </div>
          </div>

          {/* Classification */}
          <div className="text-center p-3 rounded-lg" style={{ backgroundColor: '#F5F1EB' }}>
            <div
              className="text-sm sm:text-base font-bold"
              style={{ color: result.scores.organic === 'Organic' ? '#2D6A4F' : '#B85C50' }}
            >
              {result.scores.organic}
            </div>
            <div className="text-xs uppercase font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Type
            </div>
          </div>
        </div>

        {/* Score Range Guide */}
        <div className="rounded-lg p-3" style={{ backgroundColor: '#F9F7F4' }}>
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>0-20 Very Poor</span>
            <span>21-40 Poor</span>
            <span>41-60 Fair</span>
            <span>61-80 Good</span>
            <span>81-100 Excellent</span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden mt-1.5 gap-0.5">
            <div className="flex-1 rounded-l-full" style={{ backgroundColor: '#B85C50' }}></div>
            <div className="flex-1" style={{ backgroundColor: '#C07040' }}></div>
            <div className="flex-1" style={{ backgroundColor: '#D4A574' }}></div>
            <div className="flex-1" style={{ backgroundColor: '#4A7C59' }}></div>
            <div className="flex-1 rounded-r-full" style={{ backgroundColor: '#2D6A4F' }}></div>
          </div>
        </div>

        {/* EU Standards Note */}
        <div className="rounded p-2.5 mt-3 text-xs leading-relaxed" style={{ backgroundColor: '#F5F1EB', color: 'var(--text-secondary)' }}>
          Scored using EU Cosmetics Regulation (EC) No 1223/2009 standards
        </div>
      </div>

      {/* Overall Verdict */}
      <div className="bg-white rounded-lg border p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
        <h3 className="text-xs sm:text-sm font-bold uppercase mb-2 sm:mb-3" style={{ color: 'var(--text-secondary)' }}>
          Overall Assessment
        </h3>
        <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          {result.verdict}
        </p>
      </div>

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

      {/* Positive Ingredients - Grouped by Category */}
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
                      <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {item.name}
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

      {/* Negative Ingredients - Grouped by Category */}
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
                      <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        {item.name}
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
