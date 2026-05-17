/** Shared score bands: 0–24 Very Poor, 25–49 Poor, 50–64 Fair, 65–79 Good, 80–100 Excellent */

export function getScoreColor(s: number): string {
  if (s >= 80) return '#2D6A4F';
  if (s >= 65) return '#40916C';
  if (s >= 50) return '#C49A3C';
  if (s >= 25) return '#C07040';
  return '#B85C50';
}

export function getScoreLabel(s: number): string {
  if (s >= 80) return 'Excellent';
  if (s >= 65) return 'Good';
  if (s >= 50) return 'Fair';
  if (s >= 25) return 'Poor';
  return 'Very Poor';
}

export function getScoreBg(s: number): string {
  if (s >= 80) return '#E8F5EE';
  if (s >= 65) return '#EDF7F0';
  if (s >= 50) return '#FBF6E8';
  if (s >= 25) return '#FBF0EA';
  return '#FBEEEC';
}
