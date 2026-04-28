import { Fragment, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTable } from '@/hooks/useTable';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/StatusBadge';
import { RecordDialog, FieldDef } from '@/components/RecordDialog';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink, ChevronRight, Pencil, Sparkles } from 'lucide-react';
import { DraftSheet } from '@/components/DraftSheet';
import { PIPELINE_STATUSES, PILLARS, FORMATS, PLATFORMS, priorityScore, priorityLabel } from '@/lib/automation';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type Pipeline = any;

export default function PipelinePage() {
  const { rows, refresh } = useTable<Pipeline>('pipeline', 'date', false);
  const { rows: channels } = useTable<any>('channels');
  const [q, setQ] = useState(() => {
    try { return sessionStorage.getItem('pipeline:q') ?? ''; } catch { return ''; }
  });
  const [status, setStatus] = useState<string>(() => {
    try { return sessionStorage.getItem('pipeline:status') ?? 'all'; } catch { return 'all'; }
  });
  const [channelFilter, setChannelFilter] = useState<string>(() => {
    try { return sessionStorage.getItem('pipeline:channelFilter') ?? 'all'; } catch { return 'all'; }
  });
  const [platformFilter, setPlatformFilter] = useState<string>(() => {
    try { return sessionStorage.getItem('pipeline:platformFilter') ?? 'all'; } catch { return 'all'; }
  });
  const [rangeWeeks, setRangeWeeks] = useState<string>(() => {
    try { return sessionStorage.getItem('pipeline:rangeWeeks') ?? 'all'; } catch { return 'all'; }
  });
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem('pipeline:collapsedGroups');
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });
  const [scheduling, setScheduling] = useState<{ row: any; date: string } | null>(null);
  const [draftRow, setDraftRow] = useState<any | null>(null);

  // Persist filter state to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem('pipeline:q', q); } catch {}
  }, [q]);
  useEffect(() => {
    try { sessionStorage.setItem('pipeline:status', status); } catch {}
  }, [status]);
  useEffect(() => {
    try { sessionStorage.setItem('pipeline:channelFilter', channelFilter); } catch {}
  }, [channelFilter]);
  useEffect(() => {
    try { sessionStorage.setItem('pipeline:platformFilter', platformFilter); } catch {}
  }, [platformFilter]);
  useEffect(() => {
    try { sessionStorage.setItem('pipeline:rangeWeeks', rangeWeeks); } catch {}
  }, [rangeWeeks]);

  // Persist collapsed-group state per session
  useEffect(() => {
    try {
      sessionStorage.setItem('pipeline:collapsedGroups', JSON.stringify(Array.from(collapsedGroups)));
    } catch {}
  }, [collapsedGroups]);

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });
  const toggleGroup = (key: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(key) ? next.delete(key) : next.add(key);
    return next;
  });

  const channelOptions = useMemo(
    () => Array.from(new Set(channels.map(c => c.brand))).filter(Boolean) as string[],
    [channels]
  );

  const fields: FieldDef[] = [
    { name: 'date', label: 'Date', type: 'date', defaultValue: new Date().toISOString().slice(0, 10), required: true },
    { name: 'channel', label: 'Channel', type: 'select', options: channelOptions },
    { name: 'platform', label: 'Platform', type: 'select', options: PLATFORMS as any },
    { name: 'idea', label: 'Content idea', type: 'textarea', required: true, placeholder: 'What is this post about?' },
    { name: 'pillar', label: 'Content pillar', type: 'select', options: PILLARS as any },
    { name: 'format', label: 'Format', type: 'select', options: FORMATS as any },
    { name: 'hook', label: 'Hook', type: 'text' },
    { name: 'status', label: 'Status', type: 'select', options: PIPELINE_STATUSES as any, defaultValue: 'Idea' },
    { name: 'posted_link', label: 'Posted link', type: 'url' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const filtered = useMemo(() => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    let endStr: string | null = null;
    if (rangeWeeks !== 'all' && rangeWeeks !== 'past') {
      const end = new Date(today);
      end.setDate(end.getDate() + parseInt(rangeWeeks, 10) * 7);
      endStr = end.toISOString().slice(0, 10);
    }
    return rows
      .filter(r => status === 'all' || r.status === status)
      .filter(r => channelFilter === 'all' || r.channel === channelFilter)
      .filter(r => platformFilter === 'all' || r.platform === platformFilter)
      .filter(r => !q || (r.idea + ' ' + (r.hook ?? '') + ' ' + (r.channel ?? '') + ' ' + (r.platform ?? '') + ' ' + (r.notes ?? '')).toLowerCase().includes(q.toLowerCase()))
      .filter(r => {
        if (rangeWeeks === 'all' || !r.date) return rangeWeeks === 'all';
        if (rangeWeeks === 'past') return r.date < todayStr;
        return r.date >= todayStr && (!endStr || r.date <= endStr);
      })
      .map(r => ({ ...r, score: priorityScore(r), label: priorityLabel(priorityScore(r)) }))
      .sort((a, b) => b.score - a.score);
  }, [rows, q, status, channelFilter, platformFilter, rangeWeeks]);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    filtered.forEach(r => {
      const key = `${r.channel ?? 'Unassigned'} · ${r.platform ?? '—'}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    });
    return Array.from(map.entries());
  }, [filtered]);

  const allCollapsed = grouped.length > 0 && grouped.every(([k]) => collapsedGroups.has(k));
  const toggleAll = () => {
    if (allCollapsed) setCollapsedGroups(new Set());
    else setCollapsedGroups(new Set(grouped.map(([k]) => k)));
  };

  const create = async (v: any) => {
    const { error } = await supabase.from('pipeline').insert(v);
    if (error) toast.error(error.message); else { toast.success('Added to pipeline'); refresh(); }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    if (newStatus === 'Scheduled') {
      const row = rows.find(r => r.id === id);
      if (row) {
        setScheduling({ row, date: row.date || new Date().toISOString().slice(0, 10) });
        return;
      }
    }
    const { error } = await supabase.from('pipeline').update({ status: newStatus }).eq('id', id);
    if (error) toast.error(error.message); else refresh();
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
    const { error: delErr } = await supabase.from('pipeline').delete().eq('id', row.id);
    if (delErr) { toast.error(delErr.message); return; }
    toast.success('Moved to calendar');
    setScheduling(null);
    refresh();
  };

  const update = async (id: string, v: any) => {
    const { error } = await supabase.from('pipeline').update(v).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Updated'); refresh(); }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('pipeline').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); refresh(); }
  };

  return (
    <>
      <PageHeader
        title="Content Pipeline"
        subtitle="Plan, draft and ship. Items are auto-scored and ranked HIGH / MEDIUM / LOW based on pillar, format and stage."
        action={<RecordDialog title="New pipeline item" fields={fields} onSubmit={create} />}
      />

      <Card className="p-3 mb-4 surface-card flex flex-col sm:flex-row gap-2">
        <Input placeholder="Search idea, hook, channel, platform, notes…" value={q} onChange={e => setQ(e.target.value)} className="sm:max-w-sm" />
        <Select value={channelFilter} onValueChange={setChannelFilter}>
          <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {channelOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All platforms</SelectItem>
            {PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {PIPELINE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={rangeWeeks} onValueChange={setRangeWeeks}>
          <SelectTrigger className="sm:w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All dates</SelectItem>
            <SelectItem value="1">Next 1 week</SelectItem>
            <SelectItem value="2">Next 2 weeks</SelectItem>
            <SelectItem value="4">Next 4 weeks</SelectItem>
            <SelectItem value="12">Next 12 weeks</SelectItem>
            <SelectItem value="past">Past only</SelectItem>
          </SelectContent>
        </Select>
        <div className="sm:ml-auto">
          <Button size="sm" variant="outline" onClick={toggleAll} disabled={!grouped.length}>
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </Button>
        </div>
      </Card>

      <Card className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-2 py-3 w-8"></th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Idea</th>
                <th className="px-4 py-3 font-medium">Channel · Platform</th>
                <th className="px-4 py-3 font-medium">Pillar / Format</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No items yet — add your first content idea.</td></tr>
              )}
              {grouped.map(([groupKey, groupRows]) => {
                const groupCollapsed = collapsedGroups.has(groupKey);
                return (
                  <Fragment key={groupKey}>
                    <tr
                      className="bg-secondary/60 border-b border-border cursor-pointer hover:bg-secondary"
                      onClick={() => toggleGroup(groupKey)}
                    >
                      <td className="px-2 py-2">
                        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${groupCollapsed ? '' : 'rotate-90'}`} />
                      </td>
                      <td colSpan={7} className="px-4 py-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold tracking-tight">{groupKey}</span>
                          <span className="text-[10px] font-mono text-muted-foreground">{groupRows.length} item{groupRows.length !== 1 ? 's' : ''}</span>
                        </div>
                      </td>
                    </tr>
                    {!groupCollapsed && groupRows.map(r => {
                      const isOpen = expanded.has(r.id);
                      return (
                        <Fragment key={r.id}>
                          <tr className="border-b border-border/60 hover:bg-secondary/40 cursor-pointer" onClick={() => toggle(r.id)}>
                            <td className="px-2 py-3 align-top">
                              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                            </td>
                            <td className="px-4 py-3 align-top">
                              <div className="flex items-center gap-2">
                                <StatusBadge value={r.label} />
                                <span className="text-[11px] font-mono text-muted-foreground">{r.score}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 align-top max-w-md">
                              <div className="font-medium line-clamp-1">{r.idea}</div>
                              {r.hook && <div className="text-xs text-muted-foreground mt-0.5 line-clamp-1">↳ {r.hook}</div>}
                            </td>
                            <td className="px-4 py-3 align-top text-xs">
                              <div>{r.channel ?? '—'}</div>
                              <div className="text-muted-foreground">{r.platform ?? '—'}</div>
                            </td>
                            <td className="px-4 py-3 align-top text-xs">
                              <div>{r.pillar ?? '—'}</div>
                              <div className="text-muted-foreground">{r.format ?? '—'}</div>
                            </td>
                            <td className="px-4 py-3 align-top" onClick={e => e.stopPropagation()}>
                              <Select value={r.status} onValueChange={v => updateStatus(r.id, v)}>
                                <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {PIPELINE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3 align-top text-xs text-muted-foreground font-mono">{r.date}</td>
                            <td className="px-4 py-3 align-top" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1 justify-end">
                                {r.posted_link && (
                                  <a href={r.posted_link} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground">
                                    <ExternalLink className="h-3.5 w-3.5" />
                                  </a>
                                )}
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setDraftRow(r)} title="Open draft editor">
                                  <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                                <RecordDialog
                                  title="Edit pipeline item"
                                  fields={fields}
                                  initial={r}
                                  onSubmit={(v) => update(r.id, v)}
                                  submitLabel="Save changes"
                                  trigger={
                                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                                  }
                                />
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)} title="Delete">
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr key={r.id + '-exp'} className="border-b border-border/60 bg-secondary/20">
                              <td></td>
                              <td colSpan={7} className="px-4 py-4">
                                <div className="space-y-2 text-sm">
                                  <div>
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Idea</div>
                                    <div className="whitespace-pre-wrap">{r.idea}</div>
                                  </div>
                                  {r.hook && (
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Hook</div>
                                      <div className="whitespace-pre-wrap italic">"{r.hook}"</div>
                                    </div>
                                  )}
                                  {r.notes && (
                                    <div>
                                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</div>
                                      <div className="whitespace-pre-wrap text-muted-foreground">{r.notes}</div>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!scheduling} onOpenChange={(o) => { if (!o) setScheduling(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule on calendar</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-2">{scheduling?.row?.idea}</p>
            <div className="space-y-1.5">
              <Label>Post date</Label>
              <Input
                type="date"
                value={scheduling?.date ?? ''}
                onChange={e => setScheduling(s => s ? { ...s, date: e.target.value } : s)}
              />
            </div>
            <p className="text-[11px] text-muted-foreground">This item will be moved out of the pipeline and added to the calendar.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduling(null)}>Cancel</Button>
            <Button onClick={confirmSchedule}>Move to calendar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DraftSheet
        row={draftRow}
        open={!!draftRow}
        onOpenChange={(o) => { if (!o) setDraftRow(null); }}
      />
    </>
  );
}
