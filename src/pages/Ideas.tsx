import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTable } from '@/hooks/useTable';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { RecordDialog, FieldDef } from '@/components/RecordDialog';
import { Button } from '@/components/ui/button';
import { Trash2, ArrowRight } from 'lucide-react';
import { IDEA_STATUSES, FORMATS, PILLARS, ideaScore, ideaRank } from '@/lib/automation';
import { toast } from 'sonner';

export default function IdeasPage() {
  const { rows, refresh } = useTable<any>('ideas', 'created_at', false);
  const { rows: channels } = useTable<any>('channels');
  const [q, setQ] = useState('');
  const [rank, setRank] = useState('all');

  const channelOptions = useMemo(
    () => Array.from(new Set(channels.map(c => c.brand))).filter(Boolean) as string[],
    [channels]
  );

  const fields: FieldDef[] = [
    { name: 'category', label: 'Category', type: 'select', options: PILLARS as any },
    { name: 'channel', label: 'Channel', type: 'select', options: channelOptions },
    { name: 'idea', label: 'Idea', type: 'textarea', required: true, placeholder: 'The raw idea…' },
    { name: 'hook', label: 'Hook', type: 'text', placeholder: 'The opening line that hooks attention' },
    { name: 'content_type', label: 'Content type', type: 'select', options: FORMATS as any },
    { name: 'status', label: 'Status', type: 'select', options: IDEA_STATUSES as any, defaultValue: 'Raw' },
  ];

  const enriched = useMemo(() => rows
    .map(r => {
      const score = ideaScore(r);
      return { ...r, score, rank: ideaRank(score) };
    })
    .filter(r => rank === 'all' || r.rank === rank)
    .filter(r => !q || (r.idea + ' ' + (r.hook ?? '') + ' ' + (r.channel ?? '')).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.score - a.score),
  [rows, q, rank]);

  const create = async (v: any) => {
    const { error } = await supabase.from('ideas').insert(v);
    if (error) toast.error(error.message); else { toast.success('Idea saved'); refresh(); }
  };
  const updateStatus = async (id: string, s: string) => {
    const { error } = await supabase.from('ideas').update({ status: s }).eq('id', id);
    if (error) toast.error(error.message); else refresh();
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (error) toast.error(error.message); else refresh();
  };
  const promote = async (idea: any) => {
    const { error } = await supabase.from('pipeline').insert({
      idea: idea.idea, hook: idea.hook, channel: idea.channel,
      pillar: idea.category, format: idea.content_type, status: 'Idea',
    });
    if (error) return toast.error(error.message);
    await supabase.from('ideas').update({ status: 'In Pipeline' }).eq('id', idea.id);
    toast.success('Promoted to pipeline');
    refresh();
  };

  return (
    <>
      <PageHeader
        title="Ideas Bank"
        subtitle="Your raw idea engine. Each idea is auto-ranked HIGH / MEDIUM / LOW potential. Promote the best ones into the pipeline."
        action={<RecordDialog title="Capture an idea" fields={fields} onSubmit={create} />}
      />

      <Card className="p-3 mb-4 surface-card flex flex-col sm:flex-row gap-2">
        <Input placeholder="Search ideas…" value={q} onChange={e => setQ(e.target.value)} className="sm:max-w-sm" />
        <Select value={rank} onValueChange={setRank}>
          <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All ranks</SelectItem>
            <SelectItem value="HIGH">HIGH potential</SelectItem>
            <SelectItem value="MEDIUM">MEDIUM</SelectItem>
            <SelectItem value="LOW">LOW</SelectItem>
          </SelectContent>
        </Select>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {enriched.length === 0 && (
          <Card className="p-12 surface-card text-center text-sm text-muted-foreground md:col-span-2 lg:col-span-3">
            No ideas yet — capture your first one.
          </Card>
        )}
        {enriched.map(i => (
          <Card key={i.id} className="p-4 surface-card flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <StatusBadge value={i.rank} />
                <span className="text-[10px] font-mono text-muted-foreground">score {i.score}</span>
              </div>
              <StatusBadge value={i.status} />
            </div>
            <p className="text-sm leading-relaxed">{i.idea}</p>
            {i.hook && <p className="text-xs text-muted-foreground italic">"{i.hook}"</p>}
            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
              {i.category && <span className="px-1.5 py-0.5 rounded bg-secondary">{i.category}</span>}
              {i.content_type && <span className="px-1.5 py-0.5 rounded bg-secondary">{i.content_type}</span>}
              {i.channel && <span className="px-1.5 py-0.5 rounded bg-secondary">{i.channel}</span>}
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/60">
              <Select value={i.status} onValueChange={v => updateStatus(i.id, v)}>
                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {IDEA_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => promote(i)}>
                  Promote <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(i.id)}><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
