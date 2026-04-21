import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTable } from '@/hooks/useTable';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { RecordDialog, FieldDef } from '@/components/RecordDialog';
import { Button } from '@/components/ui/button';
import { Trash2, Clock, Upload, Download, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { PLATFORMS, suggestedPostTime } from '@/lib/automation';
import { toast } from 'sonner';
import { format, parseISO, startOfWeek, addDays, isSameDay, addWeeks } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [weekOffset, setWeekOffset] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Auto-migrate any legacy Planned/Skipped calendar rows back into the pipeline as ideas
  useEffect(() => {
    const legacy = rows.filter(r => r.status === 'Planned' || r.status === 'Skipped');
    if (!legacy.length) return;
    (async () => {
      const toInsert = legacy.map(r => ({
        idea: r.content,
        channel: r.channel ?? null,
        platform: r.platform ?? null,
        date: r.date,
        notes: r.notes ?? null,
        status: 'Idea',
      }));
      const { error: insErr } = await supabase.from('pipeline').insert(toInsert);
      if (insErr) { console.error(insErr); return; }
      const { error: delErr } = await supabase.from('calendar').delete().in('id', legacy.map(r => r.id));
      if (delErr) { console.error(delErr); return; }
      toast.success(`Moved ${legacy.length} item${legacy.length !== 1 ? 's' : ''} to pipeline`);
      refresh();
    })();
  }, [rows, refresh]);

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
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const visibleRows = useMemo(
    () => filterChannel === 'all' ? rows : rows.filter(r => r.channel === filterChannel),
    [rows, filterChannel]
  );

  const today = new Date();
  const weekStart = addWeeks(startOfWeek(today, { weekStartsOn: 1 }), weekOffset);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Auto-jump to the first week containing posts when filtering by a channel with no current-week content
  const earliestDateForFilter = useMemo(() => {
    const src = filterChannel === 'all' ? rows : rows.filter(r => r.channel === filterChannel);
    const future = src.map(r => r.date).filter(Boolean).sort();
    return future[0];
  }, [rows, filterChannel]);

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

  const downloadTemplate = () => {
    const sample = filterChannel !== 'all' ? filterChannel : (channelOptions[0] ?? 'BrandName');
    const csv = [
      'date,channel,platform,content,status,notes',
      `${new Date().toISOString().slice(0, 10)},${sample},Telegram,"Sample post — replace with your content",Planned,`,
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
          <SelectTrigger className="h-8 w-[220px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All channels</SelectItem>
            {channelOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
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
                {items.map(it => (
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
                        <div className="text-[10px] text-muted-foreground mt-1">{it.channel ?? '—'} · {it.platform ?? '—'}</div>
                      </button>
                    }
                  />
                ))}
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
                  <td className="px-4 py-2.5"><StatusBadge value={r.status} /></td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
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
    </>
  );
}
