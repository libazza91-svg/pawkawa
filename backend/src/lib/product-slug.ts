export function slugifyProductName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function toConfidencePercent(score?: number | string | null): number {
  if (score === null || score === undefined) return 0;
  const numericScore = typeof score === 'string' ? parseFloat(score) : score;
  if (Number.isNaN(numericScore)) return 0;
  if (numericScore <= 1) return Math.max(0, Math.min(100, Math.round(numericScore * 100)));
  return Math.max(0, Math.min(100, Math.round(numericScore)));
}

export function toVerificationGrade(score?: number | string | null): 'GOLD' | 'SILVER' | 'BRONZE' | 'UNVERIFIED' {
  const confidence = toConfidencePercent(score);
  if (confidence >= 90) return 'GOLD';
  if (confidence >= 80) return 'SILVER';
  if (confidence >= 60) return 'BRONZE';
  return 'UNVERIFIED';
}
