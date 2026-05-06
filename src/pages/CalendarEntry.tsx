import { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { ArrowLeft, CheckCircle2, Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useTable } from '@/hooks/useTable';
import { PLATFORMS } from '@/lib/automation';

const STATUSES = ['Scheduled', 'Posted', 'Failed'];

export default function CalendarEntry() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { rows: channels } = useTable<any>('channels');
  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.from('calendar').select('*').eq('id', id).maybeSingle();
      if (error) { toast.error(error.message); }
      setRow(data);
      setLoading(false);
    })();
  }, [id]);

  if (loading) return <div className="text-sm text-muted-foreground">Loading…</div>;
  if (!row) return (
    <div>
      <Link to="/calendar" className="text-sm text-primary inline-flex items-center gap-1"><ArrowLeft className="h-4 w-4" />Back to Calendar</Link>
      <p className="mt-4 text-sm text-muted-foreground">Entry not found.</p>
    </div>
  );

  const channelOptions = Array.from(new Set(channels.map(c => c.brand))).filter(Boolean) as string[];
  const platformOptions = row.channel
    ? Array.from(new Set(channels.filter(c => c.brand === row.channel).map(c => c.platform))) as string[]
    : (PLATFORMS as readonly string[]).slice();

  const set = (k: string, v: any) => setRow((r: any) => ({ ...r, [k]: v }));

  const save = async (overrides: Partial<any> = {}) => {
    setBusy(true);
    const payload = {
      date: row.date,
      channel: row.channel || null,
      platform: row.platform || null,
      content: row.content,
      status: row.status,
      posted_link: row.posted_link || null,
      notes: row.notes || null,
      ...overrides,
    };
    const { error } = await supabase.from('calendar').update(payload).eq('id', row.id);
    setBusy(false);
    if (error) { toast.error(error.message); return false; }
    toast.success('Saved');
    setRow((r: any) => ({ ...r, ...payload }));
    return true;
  };

  const markPosted = async () => {
    if (!row.posted_link?.trim()) {
      toast.error('Add the posted link URL before marking as Posted');
      return;
    }
    const ok = await save({ status: 'Posted' });
    if (ok) navigate('/calendar');
  };

  const remove = async () => {
    if (!confirm('Delete this scheduled post?')) return;
    const { error } = await supabase.from('calendar').delete().eq('id', row.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Deleted');
    navigate('/calendar');
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="sm" onClick={() => navigate('/calendar')}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />Back to Calendar
        </Button>
        <div className="flex gap-2">
          {row.posted_link && (
            <a href={row.posted_link} target="_blank" rel="noreferrer">
              <Button variant="ghost" size="sm"><ExternalLink className="h-4 w-4 mr-1.5" />Open post</Button>
            </a>
          )}
          <Button variant="ghost" size="sm" onClick={remove}><Trash2 className="h-4 w-4 mr-1.5" />Delete</Button>
        </div>
      </div>

      <Card className="surface-card p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Date</Label>
            <Input type="date" value={row.date ?? ''} onChange={e => set('date', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Channel</Label>
            <Select value={row.channel ?? ''} onValueChange={v => set('channel', v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {channelOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Platform</Label>
            <Select value={row.platform ?? ''} onValueChange={v => set('platform', v)}>
              <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {platformOptions.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Content</Label>
          <Textarea
            value={row.content ?? ''}
            onChange={e => set('content', e.target.value)}
            rows={16}
            className="min-h-[360px] text-base leading-relaxed font-mono"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Status</Label>
            <Select value={row.status} onValueChange={v => set('status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">Posted link</Label>
            <Input type="url" placeholder="https://…" value={row.posted_link ?? ''} onChange={e => set('posted_link', e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wider text-muted-foreground">Notes</Label>
          <Textarea value={row.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={4} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border">
          <Button
            size="lg"
            onClick={markPosted}
            disabled={busy || row.status === 'Posted'}
            className="bg-primary"
          >
            <CheckCircle2 className="h-5 w-5 mr-2" />
            {row.status === 'Posted' ? 'Already Posted' : 'Mark as Posted'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/calendar')}>Cancel</Button>
            <Button onClick={() => save()} disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
