'use client';

import { useState } from 'react';
import type { AnalysisResult, IngredientCategory } from '@/types';
import AiDisclaimer from '@/components/AiDisclaimer';
import {
  getScoreBg,
  getScoreColor,
  getScoreLabel,
  SCORE_SCALE_SEGMENTS,
} from '@/lib/score-display';
import { resolveDisplayImageUrl, sanitizeProductImageUrl } from '@/lib/utils/product-image-url';

function ProductThumbnail({
  productName,
  brand,
  imageUrl,
  size = 88,
}: {
  productName: string;
  brand?: string;
  imageUrl?: string | null;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const safeUrl = imageUrl?.startsWith('data:image/')
    ? imageUrl
    : sanitizeProductImageUrl(imageUrl);
  const showImage = safeUrl && !failed;

  return (
    <div
      className="flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden border"
      style={{
        width: size,
        height: size,
        minWidth: size,
        backgroundColor: '#F5F1EB',
        borderColor: 'var(--border)',
      }}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={safeUrl}
          alt={productName}
          className="w-full h-full object-contain p-1"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="text-2xl font-bold opacity-40 select-none"
          style={{ color: '#2D6A4F' }}
          aria-hidden
        >
          {(brand || productName).charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}

function AltProductImage({
  productName,
  brand,
  imageUrl,
}: {
  productName: string;
  brand: string;
  imageUrl?: string | null;
}) {
  return (
    <ProductThumbnail
      productName={productName}
      brand={brand}
      imageUrl={imageUrl}
      size={88}
    />
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = getScoreColor(score);
  const bg = getScoreBg(score);
  const compact = score >= 100;

  return (
    <div className="flex-shrink-0 flex flex-col items-center gap-1">
      <div
        className="rounded-full flex flex-col items-center justify-center border-[3px]"
        style={{
          width: compact ? 88 : 78,
          height: compact ? 88 : 78,
          borderColor: color,
          backgroundColor: bg,
        }}
      >
        <span
          className={`font-extrabold tabular-nums leading-none ${compact ? 'text-2xl' : 'text-3xl'}`}
          style={{ color }}
        >
          {score}
        </span>
      </div>
      <span className="text-[10px] font-medium opacity-70" style={{ color }}>
        / 100
      </span>
      <span className="text-xs font-semibold tracking-wide" style={{ color }}>
        {getScoreLabel(score)}
      </span>
    </div>
  );
}

interface ResultsDisplayProps {
  result: AnalysisResult;
  /** User-uploaded scan photo (data URL) — shown when available. */
  localImageUrl?: string | null;
}

// ─── Risk badge ───────────────────────────────────────────────────────────────
const RISK_CONFIG: Record<string, { bg: string; color: string; dot: string; label: string }> = {
  green:  { bg: '#E8F5E9', color: '#2D6A4F', dot: '#2D6A4F', label: 'Safe' },
  yellow: { bg: '#FFFBEA', color: '#92600A', dot: '#D4A017', label: 'Low Risk' },
  orange: { bg: '#FFF3E0', color: '#C05E0E', dot: '#E07B39', label: 'Moderate' },
  red:    { bg: '#FFEBEE', color: '#C62828', dot: '#C62828', label: 'Hazardous' },
};

const RiskBadge = ({ level }: { level?: string }) => {
  if (!level) return null;
  const c = RISK_CONFIG[level];
  if (!c) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ml-2 flex-shrink-0"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.dot }} />
      {c.label}
    </span>
  );
};

// ─── Category icon ────────────────────────────────────────────────────────────
const getCategoryIcon = (cat: string): string => {
  const l = cat.toLowerCase();
  if (l.includes('moistur') || l.includes('hydrat')) return '💧';
  if (l.includes('vitamin') || l.includes('antioxid')) return '🍊';
  if (l.includes('sooth') || l.includes('calm')) return '🌿';
  if (l.includes('natural') || l.includes('extract') || l.includes('oil')) return '🌱';
  if (l.includes('sun') || l.includes('uv')) return '☀️';
  if (l.includes('repair')) return '✨';
  if (l.includes('fragranc') || l.includes('scent')) return '🌸';
  if (l.includes('preserv') || l.includes('stabil')) return '🧪';
  if (l.includes('sulfat') || l.includes('cleans')) return '🫧';
  if (l.includes('allergen')) return '⚠️';
  if (l.includes('silicon') || l.includes('film')) return '🔬';
  if (l.includes('color') || l.includes('dye')) return '🎨';
  if (l.includes('ph') || l.includes('buffer')) return '⚖️';
  return '📋';
};

// ─── Shared card wrapper ──────────────────────────────────────────────────────
const Card = ({
  children,
  className = '',
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={`bg-white rounded-2xl border shadow-sm ${className}`}
    style={{ borderColor: 'var(--border)', ...style }}
  >
    {children}
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SectionHeader = ({
  icon,
  label,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) => (
  <div className="flex items-center gap-2.5 mb-4">
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
      style={{ backgroundColor: color }}
    >
      {icon}
    </div>
    <h3 className="text-base sm:text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
      {label}
    </h3>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
export default function ResultsDisplay({ result, localImageUrl }: ResultsDisplayProps) {
  const [showIngredients, setShowIngredients] = useState(false);
  const score = result.score;
  const scorePercent = Math.min(100, Math.max(0, score));

  const searchMatch = result.search_match;
  const displayImage = resolveDisplayImageUrl(localImageUrl, result.image_url);
  const brandGuess = result.product_name.split(/\s+/)[0] ?? '';

  return (
    <div className="space-y-4 animate-fadeIn">
      <AiDisclaimer className="px-1" />

      {searchMatch && (
        <div
          className="rounded-xl px-4 py-3 text-xs sm:text-sm leading-relaxed"
          style={{
            backgroundColor: '#F0F7F4',
            color: 'var(--text-secondary)',
            border: '1px solid #C8E6D4',
          }}
        >
          <p>
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Most relevant match
            </span>
            {' '}for &ldquo;{searchMatch.query}&rdquo;
            {searchMatch.note ? ` — ${searchMatch.note}` : ''}.
          </p>
        </div>
      )}

      {/* ── 1. Score Card ───────────────────────────────────────────────────── */}
      <Card className="p-5 sm:p-6">
        {/* Product name + score circle */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <ProductThumbnail
            productName={result.product_name}
            brand={brandGuess}
            imageUrl={displayImage}
            size={96}
          />
          <div className="flex-1 min-w-0">
            <h2
              className="text-xl sm:text-2xl font-bold tracking-tight leading-snug"
              style={{ color: 'var(--text-primary)' }}
            >
              {result.product_name}
            </h2>
            <p
              className="text-xs sm:text-sm capitalize mt-1 font-medium"
              style={{ color: 'var(--text-secondary)' }}
            >
              {result.product_type?.replace(/_/g, ' ') || 'Cosmetic Product'}
            </p>
          </div>
          <ScoreRing score={score} />
        </div>

        {/* Grading bar */}
        <div
          className="rounded-xl px-4 py-3.5"
          style={{ backgroundColor: 'var(--surface)' }}
        >
          {/* Coloured segments + dot marker */}
          <div className="relative flex h-3.5 rounded-full overflow-hidden mb-2.5">
            {SCORE_SCALE_SEGMENTS.map((seg, i) => (
              <div
                key={i}
                className="h-full"
                style={{ width: `${seg.width}%`, backgroundColor: seg.color }}
              />
            ))}
            {/* Dot */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full border-2 shadow-md pointer-events-none"
              style={{
                left: `calc(${scorePercent}% - 8px)`,
                borderColor: getScoreColor(score),
              }}
              aria-hidden
            />
          </div>
          {/* Labels */}
          <div
            className="flex text-[10px] sm:text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {SCORE_SCALE_SEGMENTS.map((seg, i) => (
              <span key={i} className="text-center" style={{ width: `${seg.width}%` }}>
                {seg.label}
              </span>
            ))}
          </div>
        </div>
      </Card>

      {/* ── 2. Verdict ──────────────────────────────────────────────────────── */}
      <Card className="p-5 sm:p-6">
        <p
          className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2.5"
          style={{ color: 'var(--text-secondary)' }}
        >
          Overall Assessment
        </p>
        <p
          className="text-sm sm:text-[15px] leading-relaxed"
          style={{ color: 'var(--text-primary)' }}
        >
          {result.verdict}
        </p>
      </Card>

      {/* ── 3. Healthier Alternative ────────────────────────────────────────── */}
      {result.healthier_alternative && (() => {
        const alt = result.healthier_alternative!;
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(`${alt.product_name} ${alt.brand}`)}`;
        return (
          <Card style={{ borderColor: '#4A7C59', borderWidth: 2 }}>
            {/* Header strip */}
            <div
              className="flex items-center gap-2 px-5 py-3 rounded-t-2xl border-b"
              style={{ backgroundColor: '#F0FAF4', borderColor: '#C9E8D4' }}
            >
              <span className="text-base" aria-hidden>💚</span>
              <h3 className="font-bold text-sm sm:text-base" style={{ color: '#2D6A4F' }}>
                Healthier Alternative
              </h3>
            </div>
            {/* Body */}
            <div className="p-5 sm:p-6 flex gap-4">
              {/* Image */}
              <div
                className="flex-shrink-0 rounded-xl flex items-center justify-center overflow-hidden"
                style={{
                  width: 88,
                  height: 88,
                  backgroundColor: '#F5F1EB',
                  minWidth: 88,
                }}
              >
                <AltProductImage
                  productName={alt.product_name}
                  brand={alt.brand}
                  imageUrl={alt.image_url}
                />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm sm:text-base leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {alt.product_name}
                </p>
                <p className="text-xs mt-0.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  by {alt.brand}
                </p>
                <p className="text-xs sm:text-sm mt-2 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {alt.reason}
                </p>
                <a
                  href={googleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold rounded-lg px-3 py-1.5 transition-opacity hover:opacity-80"
                  style={{ color: '#2D6A4F', backgroundColor: 'rgba(45, 106, 79, 0.1)' }}
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                  </svg>
                  Search on Google
                </a>
              </div>
              {/* Alt score */}
              <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-1">
                <div
                  className="rounded-full flex flex-col items-center justify-center border-2"
                  style={{
                    width: 52,
                    height: 52,
                    borderColor: getScoreColor(alt.estimated_score),
                    backgroundColor: getScoreBg(alt.estimated_score),
                  }}
                >
                  <span
                    className="text-base font-extrabold leading-none"
                    style={{ color: getScoreColor(alt.estimated_score) }}
                  >
                    {alt.estimated_score}
                  </span>
                  <span
                    className="text-[9px] font-semibold opacity-70"
                    style={{ color: getScoreColor(alt.estimated_score) }}
                  >
                    est.
                  </span>
                </div>
                <span
                  className="text-[9px] font-semibold text-center leading-tight"
                  style={{ color: getScoreColor(alt.estimated_score) }}
                >
                  {getScoreLabel(alt.estimated_score)}
                </span>
              </div>
            </div>
          </Card>
        );
      })()}

      {/* ── 4. Detected Ingredients (collapsible) ───────────────────────────── */}
      {result.detected_ingredients && result.detected_ingredients.length > 0 && (
        <Card className="p-5 sm:p-6">
          <button
            onClick={() => setShowIngredients(!showIngredients)}
            className="w-full flex items-center justify-between"
          >
            <p
              className="text-[10px] sm:text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--text-secondary)' }}
            >
              Detected Ingredients ({result.detected_ingredients.length})
            </p>
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${showIngredients ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              style={{ color: 'var(--text-secondary)' }}
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showIngredients && (
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {result.detected_ingredients.map((ing, i) => (
                <span
                  key={i}
                  className="text-xs px-2.5 py-1 rounded-full font-medium"
                  style={{ backgroundColor: '#F5F1EB', color: 'var(--text-primary)' }}
                >
                  {ing}
                </span>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* ── 5. What's Good In It ─────────────────────────────────────────────── */}
      {result.positive_ingredients.length > 0 && (
        <Card className="p-5 sm:p-6">
          <SectionHeader icon="✓" label="What's Good In It" color="#4A7C59" />
          <div className="space-y-5">
            {result.positive_ingredients.map((group: IngredientCategory, gi: number) => (
              <div key={gi}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base leading-none">{getCategoryIcon(group.category)}</span>
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wide" style={{ color: '#4A7C59' }}>
                    {group.category}
                  </h4>
                </div>
                <div className="space-y-3 pl-7">
                  {group.items.map((item, ii) => (
                    <div key={ii}>
                      <div className="flex items-center flex-wrap gap-y-0.5">
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {item.name}
                        </span>
                        <RiskBadge level={item.risk_level} />
                      </div>
                      {item.benefit && (
                        <p
                          className="text-xs leading-relaxed mt-0.5"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {item.benefit}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── 6. What to Watch Out For ────────────────────────────────────────── */}
      {result.negative_ingredients.length > 0 && (
        <Card className="p-5 sm:p-6">
          <SectionHeader icon="!" label="What to Watch Out For" color="#B85C50" />
          <div className="space-y-5">
            {result.negative_ingredients.map((group: IngredientCategory, gi: number) => (
              <div key={gi}>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="text-base leading-none">{getCategoryIcon(group.category)}</span>
                  <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wide" style={{ color: '#B85C50' }}>
                    {group.category}
                  </h4>
                </div>
                <div className="space-y-3 pl-7">
                  {group.items.map((item, ii) => (
                    <div key={ii}>
                      <div className="flex items-center flex-wrap gap-y-0.5">
                        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                          {item.name}
                        </span>
                        <RiskBadge level={item.risk_level} />
                      </div>
                      {item.concern && (
                        <p
                          className="text-xs leading-relaxed mt-0.5"
                          style={{ color: 'var(--text-secondary)' }}
                        >
                          {item.concern}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  );
}
