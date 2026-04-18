import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTable } from '@/hooks/useTable';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { RecordDialog, FieldDef } from '@/components/RecordDialog';
import { Button } from '@/components/ui/button';
import { Trash2, Clock } from 'lucide-react';
import { PLATFORMS, suggestedPostTime } from '@/lib/automation';
import { toast } from 'sonner';
import { format, parseISO, startOfWeek, addDays, isSameDay } from 'date-fns';

const STATUSES = ['Planned', 'Scheduled', 'Posted', 'Skipped'];

export default function CalendarPage() {
  const { rows, refresh } = useTable<any>('calendar', 'date', true);
  const { rows: channels } = useTable<any>('channels');

  const channelOptions = useMemo(
    () => Array.from(new Set(channels.map(c => c.brand))).filter(Boolean) as string[],
    [channels]
  );

  const fields: FieldDef[] = [
    { name: 'date', label: 'Date', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
    { name: 'channel', label: 'Channel', type: 'select', options: channelOptions },
    { name: 'platform', label: 'Platform', type: 'select', options: PLATFORMS as any },
    { name: 'content', label: 'Content', type: 'textarea', required: true },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES, defaultValue: 'Planned' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    rows.forEach(r => {
      try {
        const d = parseISO(r.date);
        const key = format(d, 'yyyy-MM-dd');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      } catch {}
    });
    return map;
  }, [rows]);

  const create = async (v: any) => {
    const { error } = await supabase.from('calendar').insert(v);
    if (error) toast.error(error.message); else { toast.success('Scheduled'); refresh(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('calendar').delete().eq('id', id);
    if (error) toast.error(error.message); else refresh();
  };

  return (
    <>
      <PageHeader
        title="Content Calendar"
        subtitle={`Week of ${format(weekStart, 'MMM d')}. Posting times auto-suggested per platform: X 12:00 · IG 18:00 · Telegram 20:00.`}
        action={<RecordDialog title="Schedule content" fields={fields} onSubmit={create} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-7 gap-2 mb-6">
        {days.map(d => {
          const key = format(d, 'yyyy-MM-dd');
          const items = byDay.get(key) ?? [];
          const isToday = isSameDay(d, today);
          return (
            <Card key={key} className={`p-3 surface-card min-h-[160px] ${isToday ? 'ring-1 ring-primary/50' : ''}`}>
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{format(d, 'EEE')}</div>
                  <div className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>{format(d, 'd')}</div>
                </div>
                {items.length > 0 && <span className="text-[10px] font-mono text-muted-foreground">{items.length}</span>}
              </div>
              <div className="space-y-1.5">
                {items.map(it => (
                  <div key={it.id} className="rounded border border-border bg-card/60 p-2 text-xs">
                    <div className="flex items-center justify-between gap-1">
                      <StatusBadge value={it.status} className="text-[10px]" />
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-mono">
                        <Clock className="h-2.5 w-2.5" />{suggestedPostTime(it.platform)}
                      </span>
                    </div>
                    <div className="mt-1 line-clamp-2 leading-snug">{it.content}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{it.channel ?? '—'} · {it.platform ?? '—'}</div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="surface-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">All scheduled</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-2.5 font-medium">Date</th>
                <th className="px-4 py-2.5 font-medium">Day</th>
                <th className="px-4 py-2.5 font-medium">Channel · Platform</th>
                <th className="px-4 py-2.5 font-medium">Content</th>
                <th className="px-4 py-2.5 font-medium">Time</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">Nothing scheduled yet.</td></tr>}
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-2.5 text-xs">{(() => { try { return format(parseISO(r.date), 'EEE'); } catch { return '—'; } })()}</td>
                  <td className="px-4 py-2.5 text-xs">{r.channel ?? '—'} <span className="text-muted-foreground">· {r.platform ?? '—'}</span></td>
                  <td className="px-4 py-2.5 text-xs max-w-md truncate">{r.content}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{suggestedPostTime(r.platform)}</td>
                  <td className="px-4 py-2.5"><StatusBadge value={r.status} /></td>
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
