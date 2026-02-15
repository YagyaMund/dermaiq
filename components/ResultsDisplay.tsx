'use client';

import type { AnalysisResult } from '@/types';

interface ResultsDisplayProps {
  result: AnalysisResult;
}

export default function ResultsDisplay({ result }: ResultsDisplayProps) {
  const getScoreColor = (score: number): string => {
    if (score >= 75) return '#4A7C59'; // Green - Good
    if (score >= 60) return '#D4A574'; // Warning - Medium
    return '#B85C50'; // Red - Poor
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Product Name & Scores */}
      <div className="bg-white rounded-lg border p-4 sm:p-6" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6" style={{ color: 'var(--text-primary)' }}>
          {result.product_name}
        </h2>
        
        {/* Score Cards - Mobile Optimized */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {/* Quality */}
          <div className="text-center p-3 sm:p-4 rounded-lg" style={{ backgroundColor: '#F5F1EB' }}>
            <div className="text-3xl sm:text-4xl font-bold mb-0.5 sm:mb-1" style={{ color: getScoreColor(result.scores.quality) }}>
              {result.scores.quality}
            </div>
            <div className="text-xs uppercase font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Quality
            </div>
            <div className="text-xs sm:text-sm font-semibold" style={{ color: getScoreColor(result.scores.quality) }}>
              {getScoreLabel(result.scores.quality)}
            </div>
          </div>

          {/* Safety */}
          <div className="text-center p-3 sm:p-4 rounded-lg" style={{ backgroundColor: '#F5F1EB' }}>
            <div className="text-3xl sm:text-4xl font-bold mb-0.5 sm:mb-1" style={{ color: getScoreColor(result.scores.safety) }}>
              {result.scores.safety}
            </div>
            <div className="text-xs uppercase font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
              Safety
            </div>
            <div className="text-xs sm:text-sm font-semibold" style={{ color: getScoreColor(result.scores.safety) }}>
              {getScoreLabel(result.scores.safety)}
            </div>
          </div>

          {/* Type */}
          <div className="text-center p-3 sm:p-4 rounded-lg" style={{ backgroundColor: '#F5F1EB' }}>
            <div className="text-base sm:text-lg font-bold mb-0.5 sm:mb-1 break-words" style={{ color: 'var(--text-primary)' }}>
              {result.scores.organic}
            </div>
            <div className="text-xs uppercase font-medium" style={{ color: 'var(--text-secondary)' }}>
              Type
            </div>
          </div>
        </div>

        {/* EU Standards Note */}
        <div className="rounded p-2.5 sm:p-3 text-xs leading-relaxed" style={{ backgroundColor: '#F5F1EB', color: 'var(--text-secondary)' }}>
          <span className="inline-block mr-1">★</span>
          Analyzed using strict European (EU) cosmetic safety standards
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

      {/* Positive Ingredients */}
      {result.positive_ingredients.length > 0 && (
        <div className="bg-white rounded-lg border p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-sm sm:text-base font-bold flex-shrink-0" style={{ backgroundColor: '#4A7C59' }}>
              ✓
            </div>
            <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Good Ingredients
            </h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {result.positive_ingredients.map((item, index) => (
              <div key={index} className="pl-0 sm:pl-2">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0">✓</span>
                  <div className="font-semibold text-sm sm:text-base leading-tight" style={{ color: '#4A7C59' }}>
                    {item.name}
                  </div>
                </div>
                <div className="text-xs sm:text-sm leading-relaxed pl-7" style={{ color: 'var(--text-secondary)' }}>
                  {item.benefit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Negative Ingredients */}
      {result.negative_ingredients.length > 0 && (
        <div className="bg-white rounded-lg border p-4 sm:p-5" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-2 mb-3 sm:mb-4">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white text-base sm:text-lg font-bold flex-shrink-0" style={{ backgroundColor: '#B85C50' }}>
              !
            </div>
            <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Ingredients to Watch Out For
            </h3>
          </div>
          <div className="space-y-3 sm:space-y-4">
            {result.negative_ingredients.map((item, index) => (
              <div key={index} className="pl-0 sm:pl-2">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-lg leading-none mt-0.5 flex-shrink-0">⚠</span>
                  <div className="font-semibold text-sm sm:text-base leading-tight" style={{ color: '#B85C50' }}>
                    {item.name}
                  </div>
                </div>
                <div className="text-xs sm:text-sm leading-relaxed pl-7" style={{ color: 'var(--text-secondary)' }}>
                  {item.concern}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}