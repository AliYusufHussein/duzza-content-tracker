import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from 'recharts';
import { engagementRate, performanceTier, fmtPct, fmtNum, trendOf } from '@/lib/automation';
import { StatusBadge } from '@/components/StatusBadge';
import { format, parseISO } from 'date-fns';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const [posts, ideas, growth, channels, pipeline] = await Promise.all([
        supabase.from('posts').select('*').order('date', { ascending: true }),
        supabase.from('ideas').select('*'),
        supabase.from('growth').select('*').order('date', { ascending: true }),
        supabase.from('channels').select('*'),
        supabase.from('pipeline').select('*'),
      ]);

      const postRows = posts.data ?? [];
      const viralCount = postRows.filter(p => performanceTier(engagementRate(p as any)) === 'VIRAL').length;
      const totalEng = postRows.reduce((s, p) => s + engagementRate(p as any), 0);
      const avgEng = postRows.length ? totalEng / postRows.length : 0;

      // Engagement trend over time (by date)
      const byDate: Record<string, { date: string; rate: number; n: number }> = {};
      postRows.forEach(p => {
        const r = engagementRate(p as any);
        const k = p.date;
        byDate[k] ??= { date: k, rate: 0, n: 0 };
        byDate[k].rate += r;
        byDate[k].n += 1;
      });
      const engTrend = Object.values(byDate)
        .map(d => ({ date: d.date, rate: +(d.rate / d.n * 100).toFixed(2) }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Growth per platform (latest)
      const growthRows = growth.data ?? [];
      const platMap: Record<string, { platform: string; followers: number }> = {};
      growthRows.forEach(g => {
        platMap[g.platform ?? '—'] ??= { platform: g.platform ?? '—', followers: 0 };
        platMap[g.platform ?? '—'].followers = g.followers; // last (sorted asc) wins
      });
      const growthPerPlatform = Object.values(platMap);

      // Tier distribution
      const tiers = { VIRAL: 0, GOOD: 0, LOW: 0 };
      postRows.forEach(p => { tiers[performanceTier(engagementRate(p as any))]++; });
      const tierData = Object.entries(tiers).map(([k, v]) => ({ tier: k, count: v }));

      setStats({
        totalPosts: postRows.length,
        viralCount,
        avgEng,
        activeIdeas: (ideas.data ?? []).filter(i => i.status !== 'Used').length,
        channels: (channels.data ?? []).length,
        pipelineCount: (pipeline.data ?? []).length,
        engTrend,
        growthPerPlatform,
        tierData,
      });
    })();
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Your content operating system at a glance — what's working, what's growing, and what to ship next."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi label="Total Posts" value={stats ? fmtNum(stats.totalPosts) : '—'} />
        <Kpi label="Viral Posts" value={stats ? fmtNum(stats.viralCount) : '—'} accent="viral" />
        <Kpi label="Avg Engagement" value={stats ? fmtPct(stats.avgEng) : '—'} accent="primary" />
        <Kpi label="Active Ideas" value={stats ? fmtNum(stats.activeIdeas) : '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <Card className="p-5 surface-card lg:col-span-2">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="text-sm font-semibold tracking-tight">Engagement trend</h3>
            <span className="text-[11px] text-muted-foreground">Avg per posting day · %</span>
          </div>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={stats?.engTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11}
                  tickFormatter={(v) => { try { return format(parseISO(v), 'MMM d'); } catch { return v; } }} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} unit="%" />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Line type="monotone" dataKey="rate" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 surface-card">
          <h3 className="text-sm font-semibold tracking-tight mb-4">Performance distribution</h3>
          <div className="h-56">
            <ResponsiveContainer>
              <BarChart data={stats?.tierData ?? []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="tier" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 surface-card">
        <h3 className="text-sm font-semibold tracking-tight mb-4">Growth per platform</h3>
        {(stats?.growthPerPlatform?.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">Add growth snapshots to see audience size per platform.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {stats.growthPerPlatform.map((g: any) => (
              <div key={g.platform} className="rounded-lg border border-border bg-card/60 p-3">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{g.platform}</div>
                <div className="text-lg font-semibold mt-1">{fmtNum(g.followers)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: 'viral' | 'primary' }) {
  return (
    <Card className="p-4 surface-card">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${accent === 'viral' ? 'text-tier-viral' : accent === 'primary' ? 'text-gradient' : ''}`}>{value}</div>
    </Card>
  );
}
