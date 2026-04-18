import { cn } from '@/lib/utils';

const colorMap: Record<string, string> = {
  // statuses
  Idea: 'bg-status-idea/15 text-status-idea border-status-idea/30',
  Drafting: 'bg-status-drafting/15 text-status-drafting border-status-drafting/30',
  Scheduled: 'bg-status-scheduled/15 text-status-scheduled border-status-scheduled/30',
  Posted: 'bg-status-posted/15 text-status-posted border-status-posted/30',
  Repurposed: 'bg-status-repurposed/15 text-status-repurposed border-status-repurposed/30',
  Planned: 'bg-status-scheduled/15 text-status-scheduled border-status-scheduled/30',
  Done: 'bg-status-posted/15 text-status-posted border-status-posted/30',
  Raw: 'bg-status-idea/15 text-status-idea border-status-idea/30',
  Refined: 'bg-status-drafting/15 text-status-drafting border-status-drafting/30',
  'In Pipeline': 'bg-status-scheduled/15 text-status-scheduled border-status-scheduled/30',
  Used: 'bg-status-posted/15 text-status-posted border-status-posted/30',
  // tiers
  VIRAL: 'bg-tier-viral/15 text-tier-viral border-tier-viral/30',
  GOOD: 'bg-tier-good/15 text-tier-good border-tier-good/30',
  LOW: 'bg-tier-low/15 text-tier-low border-tier-low/30',
  HIGH: 'bg-primary/15 text-primary border-primary/30',
  MEDIUM: 'bg-status-drafting/15 text-status-drafting border-status-drafting/30',
  // trends
  GROWING: 'bg-trend-up/15 text-trend-up border-trend-up/30',
  STABLE: 'bg-trend-flat/15 text-trend-flat border-trend-flat/30',
  DECLINING: 'bg-trend-down/15 text-trend-down border-trend-down/30',
};

export function StatusBadge({ value, className }: { value: string; className?: string }) {
  const cls = colorMap[value] ?? 'bg-muted text-muted-foreground border-border';
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium tracking-wide', cls, className)}>
      {value}
    </span>
  );
}
