/** Score bands: Very Poor 0–20, Poor 20–40, Fair 40–60, Good 60–80, Excellent 80–100 */

export const SCORE_SCALE_SEGMENTS = [
  { width: 20, color: '#B85C50', label: 'Very Poor' },
  { width: 20, color: '#C07040', label: 'Poor' },
  { width: 20, color: '#C49A3C', label: 'Fair' },
  { width: 20, color: '#4A7C59', label: 'Good' },
  { width: 20, color: '#2D6A4F', label: 'Excellent' },
] as const;

export function getScoreColor(s: number): string {
  if (s >= 80) return '#2D6A4F';
  if (s >= 60) return '#4A7C59';
  if (s >= 40) return '#C49A3C';
  if (s >= 20) return '#C07040';
  return '#B85C50';
}

export function getScoreLabel(s: number): string {
  if (s >= 80) return 'Excellent';
  if (s >= 60) return 'Good';
  if (s >= 40) return 'Fair';
  if (s >= 20) return 'Poor';
  return 'Very Poor';
}

export function getScoreBg(s: number): string {
  if (s >= 80) return '#E8F5E9';
  if (s >= 60) return '#F1F8E9';
  if (s >= 40) return '#FFFBEA';
  if (s >= 20) return '#FFF3E0';
  return '#FFEBEE';
}
