import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTable } from '@/hooks/useTable';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { RecordDialog, FieldDef } from '@/components/RecordDialog';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink } from 'lucide-react';
import { PLATFORMS, FORMATS, engagementRate, performanceTier, fmtPct, fmtNum } from '@/lib/automation';
import { toast } from 'sonner';

export default function PerformancePage() {
  const { rows, refresh } = useTable<any>('posts', 'date', false);
  const { rows: channels } = useTable<any>('channels');
  const [q, setQ] = useState('');

  const channelOptions = useMemo(
    () => Array.from(new Set(channels.map(c => c.brand))).filter(Boolean) as string[],
    [channels]
  );

  const fields: FieldDef[] = [
    { name: 'date', label: 'Date', type: 'date', defaultValue: new Date().toISOString().slice(0, 10), required: true },
    { name: 'channel', label: 'Channel', type: 'select', options: channelOptions },
    { name: 'platform', label: 'Platform', type: 'select', options: PLATFORMS as any },
    { name: 'post_link', label: 'Post link', type: 'url' },
    { name: 'content_type', label: 'Content type', type: 'select', options: FORMATS as any },
    { name: 'views', label: 'Views', type: 'number', defaultValue: 0 },
    { name: 'likes', label: 'Likes', type: 'number', defaultValue: 0 },
    { name: 'comments', label: 'Comments', type: 'number', defaultValue: 0 },
    { name: 'shares', label: 'Shares', type: 'number', defaultValue: 0 },
    { name: 'saves', label: 'Saves', type: 'number', defaultValue: 0 },
  ];

  const enriched = useMemo(() => rows
    .filter(r => !q || ((r.channel ?? '') + ' ' + (r.platform ?? '') + ' ' + (r.content_type ?? '')).toLowerCase().includes(q.toLowerCase()))
    .map(r => {
      const er = engagementRate(r);
      return { ...r, er, tier: performanceTier(er) };
    }), [rows, q]);

  const create = async (v: any) => {
    const { error } = await supabase.from('posts').insert(v);
    if (error) toast.error(error.message); else { toast.success('Post tracked'); refresh(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); refresh(); }
  };

  return (
    <>
      <PageHeader
        title="Post Performance"
        subtitle="Engagement rate = (likes + comments + shares + saves) / views. Tiers auto-applied at ≥8% VIRAL, ≥4% GOOD."
        action={<RecordDialog title="Track a post" fields={fields} onSubmit={create} />}
      />

      <Card className="p-3 mb-4 surface-card">
        <Input placeholder="Search by channel, platform, type…" value={q} onChange={e => setQ(e.target.value)} className="sm:max-w-sm" />
      </Card>

      <Card className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3 font-medium">Tier</th>
                <th className="px-4 py-3 font-medium">Channel · Platform</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium text-right">Views</th>
                <th className="px-4 py-3 font-medium text-right">Likes</th>
                <th className="px-4 py-3 font-medium text-right">Comm.</th>
                <th className="px-4 py-3 font-medium text-right">Shares</th>
                <th className="px-4 py-3 font-medium text-right">Saves</th>
                <th className="px-4 py-3 font-medium text-right">ER</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {enriched.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-sm text-muted-foreground">No tracked posts yet.</td></tr>
              )}
              {enriched.map(r => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="px-4 py-3"><StatusBadge value={r.tier} /></td>
                  <td className="px-4 py-3 text-xs">
                    <div>{r.channel ?? '—'}</div>
                    <div className="text-muted-foreground">{r.platform ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 text-xs">{r.content_type ?? '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(r.views)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(r.likes)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(r.comments)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(r.shares)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs">{fmtNum(r.saves)}</td>
                  <td className="px-4 py-3 text-right font-mono text-xs font-semibold">{fmtPct(r.er)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{r.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {r.post_link && <a href={r.post_link} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                    </div>
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
