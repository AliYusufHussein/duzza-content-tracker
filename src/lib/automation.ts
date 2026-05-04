// Centralized automation logic for the Content OS

export const PILLAR_WEIGHT: Record<string, number> = {
  Finance: 5, Education: 4, Tech: 4, Community: 3, Music: 3, Writing: 3,
};

export const FORMAT_WEIGHT: Record<string, number> = {
  Video: 5, Carousel: 4, Thread: 4, Text: 2,
};

export const STATUS_WEIGHT: Record<string, number> = {
  Idea: 1, Drafting: 2, Scheduled: 3, Posted: 4, Polishing: 5,
};

export const PIPELINE_STATUSES = ['Idea', 'Drafting', 'Polishing', 'Scheduled', 'Posted'] as const;
export const IDEA_STATUSES = ['Raw', 'Refined', 'In Pipeline', 'Used'] as const;
export const PLATFORMS = ['Telegram', 'X (Twitter)', 'Blog', 'YouTube', 'Instagram', 'WhatsApp'] as const;
export const PILLARS = ['Finance', 'Education', 'Tech', 'Community', 'Music', 'Writing', 'Business'] as const;
export const FORMATS = ['Video', 'Carousel', 'Text', 'Thread'] as const;

export function priorityScore(p: { pillar?: string | null; format?: string | null; status?: string | null }) {
  const pi = PILLAR_WEIGHT[p.pillar ?? ''] ?? 2;
  const fo = FORMAT_WEIGHT[p.format ?? ''] ?? 2;
  const st = STATUS_WEIGHT[p.status ?? ''] ?? 1;
  return pi * 2 + fo * 2 + st;
}

export function priorityLabel(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 16) return 'HIGH';
  if (score >= 10) return 'MEDIUM';
  return 'LOW';
}

export function engagementRate(p: { views: number; likes: number; comments: number; shares: number; saves: number }) {
  if (!p.views) return 0;
  return (p.likes + p.comments + p.shares + p.saves) / p.views;
}

export function performanceTier(rate: number): 'VIRAL' | 'GOOD' | 'LOW' {
  if (rate >= 0.08) return 'VIRAL';
  if (rate >= 0.04) return 'GOOD';
  return 'LOW';
}

export function ideaScore(i: { idea: string; hook?: string | null; content_type?: string | null }) {
  const len = (i.idea ?? '').trim().length;
  const lenScore = Math.min(5, Math.floor(len / 30));
  const hookScore = i.hook && i.hook.trim().length > 5 ? 4 : 0;
  const fmt = FORMAT_WEIGHT[i.content_type ?? ''] ?? 1;
  return lenScore + hookScore + fmt;
}

export function ideaRank(score: number): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 10) return 'HIGH';
  if (score >= 6) return 'MEDIUM';
  return 'LOW';
}

export function suggestedPostTime(platform?: string | null) {
  switch (platform) {
    case 'X (Twitter)': return '12:00';
    case 'Instagram': return '18:00';
    case 'Telegram': return '20:00';
    case 'YouTube': return '17:00';
    case 'Blog': return '09:00';
    default: return '12:00';
  }
}

export function repurposingPath(sourcePlatform?: string | null): string[] {
  switch (sourcePlatform) {
    case 'YouTube': return ['Carousel', 'Thread', 'Blog'];
    case 'X (Twitter)': return ['Telegram', 'Blog'];
    case 'Telegram': return ['X (Twitter)', 'Blog'];
    case 'Blog': return ['Thread', 'Carousel'];
    default: return ['Carousel', 'Thread'];
  }
}

export function trendOf(diff: number): 'GROWING' | 'STABLE' | 'DECLINING' {
  if (diff > 0) return 'GROWING';
  if (diff < 0) return 'DECLINING';
  return 'STABLE';
}

export function fmtPct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function fmtNum(n: number) {
  return new Intl.NumberFormat('en-US').format(n);
}
