import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTable } from '@/hooks/useTable';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { RecordDialog, FieldDef } from '@/components/RecordDialog';
import { Button } from '@/components/ui/button';
import { Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PLATFORMS, trendOf, fmtNum } from '@/lib/automation';
import { toast } from 'sonner';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';

export default function GrowthPage() {
  const { rows, refresh } = useTable<any>('growth', 'date', true);
  const { rows: channels } = useTable<any>('channels');

  const channelOptions = useMemo(
    () => Array.from(new Set(channels.map(c => c.brand))).filter(Boolean) as string[],
    [channels]
  );

  const fields: FieldDef[] = [
    { name: 'date', label: 'Date', type: 'date', defaultValue: new Date().toISOString().slice(0, 10), required: true },
    { name: 'channel', label: 'Channel', type: 'select', options: channelOptions, required: true },
    { name: 'platform', label: 'Platform', type: 'select', options: PLATFORMS as any, required: true },
    { name: 'followers', label: 'Followers', type: 'number', required: true, defaultValue: 0 },
  ];

  // group by channel+platform; compute change vs previous, trend, sparkline
  const groups = useMemo(() => {
    const map: Record<string, any[]> = {};
    rows.forEach(r => {
      const key = `${r.channel}::${r.platform}`;
      (map[key] ??= []).push(r);
    });
    return Object.entries(map).map(([key, list]) => {
      list.sort((a, b) => a.date.localeCompare(b.date));
      const last = list[list.length - 1];
      const prev = list.length > 1 ? list[list.length - 2] : null;
      const diff = prev ? last.followers - prev.followers : 0;
      return {
        key,
        channel: last.channel,
        platform: last.platform,
        followers: last.followers,
        diff,
        trend: trendOf(diff),
        history: list.map(r => ({ date: r.date, followers: r.followers })),
      };
    }).sort((a, b) => b.followers - a.followers);
  }, [rows]);

  const create = async (v: any) => {
    const { error } = await supabase.from('growth').insert(v);
    if (error) toast.error(error.message); else { toast.success('Snapshot saved'); refresh(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('growth').delete().eq('id', id);
    if (error) toast.error(error.message); else refresh();
  };

  return (
    <>
      <PageHeader
        title="Growth Tracker"
        subtitle="Snapshot follower counts over time. Trend auto-detects GROWING / STABLE / DECLINING from your last two entries."
        action={<RecordDialog title="Add growth snapshot" fields={fields} onSubmit={create} />}
      />

      {groups.length === 0 ? (
        <Card className="p-12 surface-card text-center text-sm text-muted-foreground">
          No growth data yet. Add your first snapshot to start tracking.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {groups.map(g => {
            const Icon = g.trend === 'GROWING' ? TrendingUp : g.trend === 'DECLINING' ? TrendingDown : Minus;
            const trendColor = g.trend === 'GROWING' ? 'text-trend-up' : g.trend === 'DECLINING' ? 'text-trend-down' : 'text-trend-flat';
            return (
              <Card key={g.key} className="p-4 surface-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">{g.channel}</div>
                    <div className="text-[11px] text-muted-foreground">{g.platform}</div>
                  </div>
                  <StatusBadge value={g.trend} />
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-semibold tracking-tight">{fmtNum(g.followers)}</span>
                  <span className={`text-xs flex items-center gap-0.5 ${trendColor}`}>
                    <Icon className="h-3 w-3" />
                    {g.diff > 0 ? '+' : ''}{fmtNum(g.diff)}
                  </span>
                </div>
                {g.history.length > 1 && (
                  <div className="h-16 -mx-1 mt-2">
                    <ResponsiveContainer>
                      <LineChart data={g.history}>
                        <Line type="monotone" dataKey="followers" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground mt-1 font-mono">{g.history.length} snapshot{g.history.length !== 1 && 's'}</div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="mt-6 surface-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">All snapshots</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Channel</th>
                <th className="px-4 py-2.5 font-medium">Platform</th>
                <th className="px-4 py-2.5 font-medium text-right">Followers</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-2.5 text-xs">{r.channel}</td>
                  <td className="px-4 py-2.5 text-xs">{r.platform}</td>
                  <td className="px-4 py-2.5 text-xs text-right font-mono">{fmtNum(r.followers)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
