import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useTable } from '@/hooks/useTable';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExternalLink, CheckCircle2, Inbox, Copy } from 'lucide-react';
import { toast } from 'sonner';

const STATUSES = ['Planned', 'Drafting', 'Scheduled', 'Posted', 'Skipped'];

export default function TodayPage() {
  const navigate = useNavigate();
  const today = format(new Date(), 'yyyy-MM-dd');
  const todayLabel = format(new Date(), 'EEEE, MMMM d');
  const { rows: calendar, refresh } = useTable<any>('calendar', 'date', true);
  const { rows: channels } = useTable<any>('channels');

  // From Polisher inbox
  const [polisher, setPolisher] = useState<any[]>([]);
  const [scheduling, setScheduling] = useState<{ row: any; date: string } | null>(null);

  const loadPolisher = async () => {
    const { data, error } = await supabase
      .from('pipeline')
      .select('*')
      .eq('notes', 'From Polisher')
      .eq('status', 'Drafting')
      .order('created_at', { ascending: false })
      .limit(10);
    if (error) { console.error(error); return; }
    setPolisher(data ?? []);
  };

  useEffect(() => {
    loadPolisher();
    const id = setInterval(loadPolisher, 60000);
    return () => clearInterval(id);
  }, []);

  const pushToCalendar = (row: any) => {
    setScheduling({ row, date: row.date || format(new Date(), 'yyyy-MM-dd') });
  };

  const confirmSchedule = async () => {
    if (!scheduling) return;
    const { row, date } = scheduling;
    if (!date) { toast.error('Pick a date'); return; }
    const { error: insErr } = await supabase.from('calendar').insert({
      date,
      channel: row.channel ?? null,
      platform: row.platform ?? null,
      content: [row.idea, row.hook ? `Hook: ${row.hook}` : null].filter(Boolean).join('\n\n'),
      status: 'Scheduled',
      notes: row.notes ?? null,
    });
    if (insErr) { toast.error(insErr.message); return; }
    const { error: updErr } = await supabase.from('pipeline').update({ status: 'Scheduled' }).eq('id', row.id);
    if (updErr) { toast.error(updErr.message); return; }
    toast.success('Pushed to calendar');
    setScheduling(null);
    loadPolisher();
    refresh();
  };

  const todays = useMemo(() => calendar.filter(c => c.date === today), [calendar, today]);

  // group by channel (brand)
  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    todays.forEach(t => { (map[t.channel ?? 'Unassigned'] ??= []).push(t); });
    return Object.entries(map).map(([brand, items]) => {
      const brandChannels = channels.filter(c => c.brand === brand);
      return { brand, items, brandChannels };
    });
  }, [todays, channels]);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('calendar').update({ status }).eq('id', id);
    if (error) toast.error(error.message); else refresh();
  };

  const markPosted = async (id: string) => updateStatus(id, 'Posted');

  return (
    <>
      <PageHeader
        title="Today's Posts"
        subtitle={`${todayLabel} · ${todays.length} scheduled item${todays.length !== 1 ? 's' : ''}`}
      />

      {polisher.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-semibold tracking-tight mb-3">📥 Received from Polisher</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {polisher.map(p => (
              <Card key={p.id} className="surface-card p-4 flex flex-col gap-2">
                <div className="font-medium text-sm leading-snug">
                  {(p.idea ?? '').length > 80 ? (p.idea ?? '').slice(0, 80) + '…' : p.idea}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {(p.channel ?? '—')} · {(p.platform ?? '—')}
                </div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {p.date ?? '—'} · received {p.created_at ? formatDistanceToNow(new Date(p.created_at), { addSuffix: true }) : ''}
                </div>
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/pipeline/${p.id}`)}>
                    Open
                  </Button>
                  <Button size="sm" className="h-7 text-xs" onClick={() => pushToCalendar(p)}>
                    Push to Calendar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {grouped.length === 0 && (
        <Card className="p-12 surface-card text-center">
          <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-medium">Nothing scheduled for today</p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload content per channel from the Channels page, or open the Calendar to plan ahead.
          </p>
        </Card>
      )}

      <div className="space-y-4">
        {grouped.map(g => (
          <Card key={g.brand} className="surface-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-secondary/30 flex items-center justify-between flex-wrap gap-2">
              <div>
                <div className="text-sm font-semibold tracking-tight">{g.brand}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  {g.items.length} post{g.items.length !== 1 && 's'} today
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.brandChannels.map(c => (
                  <a key={c.id} href={c.link ?? '#'} target="_blank" rel="noreferrer"
                     className="text-[11px] px-2 py-1 rounded border border-border bg-background hover:bg-secondary flex items-center gap-1">
                    {c.platform}{c.link && <ExternalLink className="h-2.5 w-2.5" />}
                  </a>
                ))}
              </div>
            </div>
            <div className="divide-y divide-border/60">
              {g.items.map(item => {
                const ch = g.brandChannels.find(c => c.platform === item.platform);
                return (
                  <div key={item.id} className="px-5 py-4 flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {item.platform && <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-secondary">{item.platform}</span>}
                        <StatusBadge value={item.status} />
                      </div>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{item.content}</p>
                      {item.notes && <p className="text-xs text-muted-foreground mt-1.5 italic">{item.notes}</p>}
                      {ch?.link && (
                        <a href={ch.link} target="_blank" rel="noreferrer"
                           className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mt-2">
                          <ExternalLink className="h-3 w-3" /> Open {item.platform}
                        </a>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Select value={item.status} onValueChange={v => updateStatus(item.id, v)}>
                        <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(item.content ?? '');
                            toast.success('Copied');
                          } catch {
                            toast.error('Copy failed');
                          }
                        }}
                      >
                        <Copy className="h-3.5 w-3.5 mr-1" /> Copy
                      </Button>
                      {item.status !== 'Posted' && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => markPosted(item.id)}>
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark posted
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!scheduling} onOpenChange={o => !o && setScheduling(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule on calendar</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="schedule-date">Date</Label>
            <Input
              id="schedule-date"
              type="date"
              value={scheduling?.date ?? ''}
              onChange={e => setScheduling(s => s ? { ...s, date: e.target.value } : s)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduling(null)}>Cancel</Button>
            <Button onClick={confirmSchedule}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
