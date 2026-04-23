import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTable } from '@/hooks/useTable';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { RecordDialog, FieldDef } from '@/components/RecordDialog';
import { Button } from '@/components/ui/button';
import { Trash2, Clock, Upload, Download, ChevronLeft, ChevronRight, Pencil, ExternalLink, Undo2 } from 'lucide-react';
import { PLATFORMS, suggestedPostTime } from '@/lib/automation';
import { toast } from 'sonner';
import { format, parseISO, startOfWeek, addDays, isSameDay, addWeeks } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const STATUSES = ['Scheduled', 'Posted'];

// Minimal CSV parser supporting quoted fields and commas inside quotes
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQ = false;
      else field += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  const [header, ...rest] = rows.filter(r => r.some(v => v.trim() !== ''));
  if (!header) return [];
  const keys = header.map(h => h.trim().toLowerCase());
  return rest.map(r => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

export default function CalendarPage() {
  const { rows, refresh } = useTable<any>('calendar', 'date', true);
  const { rows: channels } = useTable<any>('channels');
  const [filterChannel, setFilterChannel] = useState<string>('all');
  const [q, setQ] = useState('');
  const [rangeWeeks, setRangeWeeks] = useState<string>('all'); // 'all' | '1' | '2' | '4' | '12' | 'past'
  const [weekOffset, setWeekOffset] = useState(0);
  const [posting, setPosting] = useState<{ row: any; link: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-migrate any legacy Planned/Skipped calendar rows back into pipeline as ideas (transactional RPC)
  useEffect(() => {
    const hasLegacy = rows.some(r => r.status === 'Planned' || r.status === 'Skipped');
    if (!hasLegacy) return;
    (async () => {
      const { data, error } = await (supabase.rpc as any)('migrate_legacy_calendar_to_pipeline');
      if (error) { console.error(error); return; }
      const moved = (data as number) ?? 0;
      if (moved > 0) toast.success(`Moved ${moved} item${moved !== 1 ? 's' : ''} to pipeline`);
      refresh();
    })();
  }, [rows, refresh]);

  const sendBackToPipeline = async (row: any) => {
    const { error: insErr } = await supabase.from('pipeline').insert({
      idea: row.content,
      channel: row.channel ?? null,
      platform: row.platform ?? null,
      date: row.date,
      notes: row.notes ?? null,
      status: 'Idea',
    });
    if (insErr) { toast.error(insErr.message); return; }
    const { error: delErr } = await supabase.from('calendar').delete().eq('id', row.id);
    if (delErr) { toast.error(delErr.message); return; }
    toast.success('Sent back to pipeline');
    refresh();
  };

  const channelOptions = useMemo(
    () => Array.from(new Set(channels.map(c => c.brand))).filter(Boolean) as string[],
    [channels]
  );

  // Platforms valid for the selected channel (for dialog + CSV adjustment)
  const platformsForFilter = useMemo(() => {
    if (filterChannel === 'all') return PLATFORMS as readonly string[];
    return Array.from(new Set(
      channels.filter(c => c.brand === filterChannel).map(c => c.platform)
    )) as string[];
  }, [channels, filterChannel]);

  const fields: FieldDef[] = [
    { name: 'date', label: 'Date', type: 'date', required: true, defaultValue: new Date().toISOString().slice(0, 10) },
    { name: 'channel', label: 'Channel', type: 'select', options: channelOptions, defaultValue: filterChannel === 'all' ? '' : filterChannel },
    { name: 'platform', label: 'Platform', type: 'select', options: platformsForFilter as any },
    { name: 'content', label: 'Content', type: 'textarea', required: true },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES, defaultValue: 'Scheduled' },
    { name: 'posted_link', label: 'Posted link', type: 'url', placeholder: 'https://… (required when Posted)' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const visibleRows = useMemo(
    () => {
      const ql = q.trim().toLowerCase();
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      let endStr: string | null = null;
      if (rangeWeeks !== 'all' && rangeWeeks !== 'past') {
        endStr = format(addWeeks(new Date(), parseInt(rangeWeeks, 10)), 'yyyy-MM-dd');
      }
      return rows
        .filter(r => filterChannel === 'all' || r.channel === filterChannel)
        .filter(r => !ql || (`${r.content ?? ''} ${r.notes ?? ''} ${r.channel ?? ''} ${r.platform ?? ''}`).toLowerCase().includes(ql))
        .filter(r => {
          if (!r.date) return true;
          if (rangeWeeks === 'all') return true;
          if (rangeWeeks === 'past') return r.date < todayStr;
          return r.date >= todayStr && (!endStr || r.date <= endStr);
        });
    },
    [rows, filterChannel, q, rangeWeeks]
  );

  const today = new Date();
  const weekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Jump target: prefer the earliest FUTURE post; fall back to earliest overall.
  const earliestDateForFilter = useMemo(() => {
    const src = filterChannel === 'all' ? rows : rows.filter(r => r.channel === filterChannel);
    const todayStr = format(today, 'yyyy-MM-dd');
    const all = src.map(r => r.date).filter(Boolean).sort();
    const future = all.filter(d => d >= todayStr);
    return future[0] ?? all[0];
  }, [rows, filterChannel, today]);

  const byDay = useMemo(() => {
    const map = new Map<string, any[]>();
    visibleRows.forEach(r => {
      try {
        const d = parseISO(r.date);
        const key = format(d, 'yyyy-MM-dd');
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(r);
      } catch {}
    });
    return map;
  }, [visibleRows]);

  const create = async (v: any) => {
    const { error } = await supabase.from('calendar').insert(v);
    if (error) toast.error(error.message); else { toast.success('Scheduled'); refresh(); }
  };
  const update = async (id: string, v: any) => {
    const { error } = await supabase.from('calendar').update(v).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Updated'); refresh(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('calendar').delete().eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Deleted'); refresh(); }
  };
  const changeStatus = (row: any, newStatus: string) => {
    if (newStatus === 'Posted' && !row.posted_link) {
      setPosting({ row, link: '' });
      return;
    }
    update(row.id, { status: newStatus });
  };
  const confirmPosted = async () => {
    if (!posting) return;
    if (!posting.link.trim()) { toast.error('Paste the post URL'); return; }
    const { error } = await supabase.from('calendar')
      .update({ status: 'Posted', posted_link: posting.link.trim() })
      .eq('id', posting.row.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Marked as posted');
    setPosting(null);
    refresh();
  };

  const downloadTemplate = () => {
    const sample = filterChannel !== 'all' ? filterChannel : (channelOptions[0] ?? 'BrandName');
    const csv = [
      'date,channel,platform,content,status,notes',
      `${new Date().toISOString().slice(0, 10)},${sample},Telegram,"Sample post — replace with your content",Scheduled,`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'calendar-template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleUpload = async (file: File) => {
    const text = await file.text();
    const parsed = parseCSV(text);
    if (!parsed.length) { toast.error('No rows found in CSV'); return; }

    const validStatuses = new Set(STATUSES);
    const targetChannel = filterChannel === 'all' ? null : filterChannel;
    const allowedPlatformsForChannel = targetChannel
      ? new Set(channels.filter(c => c.brand === targetChannel).map(c => c.platform))
      : null;

    const records: any[] = [];
    const adjustments: string[] = [];
    parsed.forEach((row, idx) => {
      const date = row.date;
      const content = row.content;
      if (!date || !content) { adjustments.push(`Row ${idx + 2}: missing date or content (skipped)`); return; }
      const channel = targetChannel ?? row.channel ?? null;
      let platform = row.platform || null;
      // Auto-adjust: if platform isn't valid for the locked channel, swap to first available
      if (allowedPlatformsForChannel && platform && !allowedPlatformsForChannel.has(platform)) {
        const fallback = Array.from(allowedPlatformsForChannel)[0] ?? null;
        adjustments.push(`Row ${idx + 2}: "${platform}" not on ${channel} → "${fallback}"`);
        platform = fallback;
      }
      const status = validStatuses.has(row.status) ? row.status : 'Scheduled';
      records.push({ date, channel, platform, content, status, notes: row.notes || null });
    });

    if (!records.length) { toast.error('No valid rows. ' + (adjustments[0] ?? '')); return; }
    const { error } = await supabase.from('calendar').insert(records);
    if (error) { toast.error(error.message); return; }
    toast.success(`Imported ${records.length} post${records.length !== 1 ? 's' : ''}${adjustments.length ? ` · ${adjustments.length} adjusted` : ''}`);
    if (adjustments.length) console.warn('CSV import notes:', adjustments);
    refresh();
  };

  return (
    <>
      <PageHeader
        title="Content Calendar"
        subtitle={`Week of ${format(weekStart, 'MMM d, yyyy')}. Posting times auto-suggested per platform: X 12:00 · IG 18:00 · Telegram 20:00.`}
        action={<RecordDialog title="Schedule content" fields={fields} onSubmit={create} />}
      />

      <Card className="surface-card p-3 mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">Week</span>
        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setWeekOffset(o => o - 1)}><ChevronLeft className="h-3.5 w-3.5" /></Button>
        <Button size="sm" variant="outline" className="h-8" onClick={() => setWeekOffset(0)}>Today</Button>
        <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => setWeekOffset(o => o + 1)}><ChevronRight className="h-3.5 w-3.5" /></Button>
        {earliestDateForFilter && (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={() => {
              const target = startOfWeek(parseISO(earliestDateForFilter), { weekStartsOn: 1 });
              const base = startOfWeek(today, { weekStartsOn: 1 });
              const diff = Math.round((target.getTime() - base.getTime()) / (7 * 24 * 60 * 60 * 1000));
              setWeekOffset(diff);
            }}
          >
            Jump to first post
          </Button>
        )}
      </Card>

      <Card className="surface-card p-3 mb-4 flex flex-wrap items-center gap-2">
        <span className="text-[11px] uppercase tracking-wider text-muted-foreground mr-1">Channel</span>
        <Select value={filterChannel} onValueChange={(v) => { setFilterChannel(v); setWeekOffset(0); }}>
          <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {channelOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input
          placeholder="Search content, notes, platform…"
          value={q}
          onChange={e => setQ(e.target.value)}
          className="h-8 w-full sm:w-64 text-xs"
        />
        {filterChannel !== 'all' && (
          <span className="text-[11px] font-mono text-muted-foreground hidden sm:inline">
            platforms: {platformsForFilter.join(' · ') || '—'}
          </span>
        )}
        <div className="flex-1" />
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f).finally(() => { if (fileRef.current) fileRef.current.value = ''; });
          }}
        />
        <Button size="sm" variant="outline" className="h-8" onClick={downloadTemplate}>
          <Download className="h-3.5 w-3.5 mr-1.5" />Template
        </Button>
        <Button size="sm" variant="outline" className="h-8" onClick={() => fileRef.current?.click()}>
          <Upload className="h-3.5 w-3.5 mr-1.5" />
          Upload CSV{filterChannel !== 'all' ? ` → ${filterChannel}` : ''}
        </Button>
      </Card>

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
                {items.map(it => {
                  const channelLink = channels.find(c => c.brand === it.channel && c.platform === it.platform)?.link;
                  return (
                    <RecordDialog
                      key={it.id}
                      title="Edit scheduled post"
                      fields={fields}
                      initial={it}
                      onSubmit={(v) => update(it.id, v)}
                      submitLabel="Save changes"
                      trigger={
                        <button type="button" className="w-full text-left rounded border border-border bg-card/60 p-2 text-xs hover:bg-secondary/60 transition-colors">
                          <div className="flex items-center justify-between gap-1">
                            <StatusBadge value={it.status} className="text-[10px]" />
                            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground font-mono">
                              <Clock className="h-2.5 w-2.5" />{suggestedPostTime(it.platform)}
                            </span>
                          </div>
                          <div className="mt-1 line-clamp-2 leading-snug">{it.content}</div>
                          <div className="flex items-center justify-between mt-1 gap-1">
                            <div className="text-[10px] text-muted-foreground truncate">{it.channel ?? '—'} · {it.platform ?? '—'}</div>
                            <div className="flex items-center gap-1 shrink-0">
                              {channelLink && (
                                <a
                                  href={channelLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-muted-foreground hover:text-primary"
                                  title={`Open ${it.platform}`}
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                              {it.posted_link && (
                                <a
                                  href={it.posted_link}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  className="text-primary"
                                  title="Open posted link"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          </div>
                        </button>
                      }
                    />
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="surface-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
          All scheduled {filterChannel !== 'all' && <span className="text-foreground/80">· {filterChannel}</span>}
        </div>
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
              {visibleRows.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">Nothing scheduled yet.</td></tr>}
              {visibleRows.map(r => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{r.date}</td>
                  <td className="px-4 py-2.5 text-xs">{(() => { try { return format(parseISO(r.date), 'EEE'); } catch { return '—'; } })()}</td>
                  <td className="px-4 py-2.5 text-xs">{r.channel ?? '—'} <span className="text-muted-foreground">· {r.platform ?? '—'}</span></td>
                  <td className="px-4 py-2.5 text-xs max-w-md truncate">{r.content}</td>
                  <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{suggestedPostTime(r.platform)}</td>
                  <td className="px-4 py-2.5">
                    <Select value={r.status} onValueChange={(v) => changeStatus(r, v)}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {(() => {
                        const channelLink = channels.find(c => c.brand === r.channel && c.platform === r.platform)?.link;
                        return channelLink && (
                          <a href={channelLink} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground" title={`Open ${r.platform}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        );
                      })()}
                      {r.posted_link && (
                        <a href={r.posted_link} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-secondary text-primary" title="Open posted link">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => sendBackToPipeline(r)} title="Send back to pipeline">
                        <Undo2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <RecordDialog
                        title="Edit scheduled post"
                        fields={fields}
                        initial={r}
                        onSubmit={(v) => update(r.id, v)}
                        submitLabel="Save changes"
                        trigger={
                          <Button size="icon" variant="ghost" className="h-7 w-7" title="Edit"><Pencil className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                        }
                      />
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(r.id)} title="Delete"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!posting} onOpenChange={(o) => { if (!o) setPosting(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark as posted</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground line-clamp-2">{posting?.row?.content}</p>
            <div className="space-y-1.5">
              <Label>Posted link</Label>
              <Input
                type="url"
                placeholder="https://…"
                value={posting?.link ?? ''}
                onChange={e => setPosting(s => s ? { ...s, link: e.target.value } : s)}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">Paste the URL of the published post so you can jump back to it later.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPosting(null)}>Cancel</Button>
            <Button onClick={confirmPosted}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
