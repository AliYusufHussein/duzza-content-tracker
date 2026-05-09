import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PIPELINE_STATUSES } from '@/lib/automation';
import { ArrowLeft, Save, CalendarPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function PipelineEntry() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const { data, error } = await supabase.from('pipeline').select('*').eq('id', id).maybeSingle();
      if (error) toast.error(error.message);
      setRow(data);
      setLoading(false);
    })();
  }, [id]);

  const set = (k: string, v: any) => setRow((r: any) => ({ ...r, [k]: v }));

  const save = async (overrides: Record<string, any> = {}) => {
    if (!row || !id) return false;
    setSaving(true);
    const payload = {
      idea: row.idea,
      channel: row.channel ?? null,
      platform: row.platform ?? null,
      format: row.format ?? null,
      hook: row.hook ?? null,
      date: row.date,
      status: row.status,
      notes: row.notes ?? null,
      ...overrides,
    };
    const { error } = await supabase.from('pipeline').update(payload).eq('id', id);
    setSaving(false);
    if (error) { toast.error(error.message); return false; }
    return true;
  };

  const handleSave = async () => {
    const ok = await save();
    if (ok) toast.success('Saved');
  };

  const pushToCalendar = async () => {
    if (!row) return;
    const { error: insErr } = await supabase.from('calendar').insert({
      date: row.date,
      channel: row.channel ?? null,
      platform: row.platform ?? null,
      content: [row.idea, row.hook ? `Hook: ${row.hook}` : null].filter(Boolean).join('\n\n'),
      status: 'Scheduled',
      notes: row.notes ?? null,
    });
    if (insErr) { toast.error(insErr.message); return; }
    const ok = await save({ status: 'Scheduled' });
    if (!ok) return;
    toast.success('Pushed to calendar');
    navigate('/');
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Loading…</div>;
  if (!row) return (
    <div className="p-6">
      <Button variant="ghost" size="sm" onClick={() => navigate('/')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
      <p className="mt-4 text-sm text-muted-foreground">Pipeline item not found.</p>
    </div>
  );

  return (
    <>
      <div className="mb-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
      </div>
      <PageHeader title="Edit pipeline item" subtitle={row.id} />

      <Card className="surface-card p-5 space-y-4 max-w-3xl">
        <div className="space-y-2">
          <Label htmlFor="idea">Idea</Label>
          <Textarea id="idea" rows={8} value={row.idea ?? ''} onChange={e => set('idea', e.target.value)} className="font-mono text-sm" />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="channel">Channel</Label>
            <Input id="channel" value={row.channel ?? ''} onChange={e => set('channel', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="platform">Platform</Label>
            <Input id="platform" value={row.platform ?? ''} onChange={e => set('platform', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Input id="format" value={row.format ?? ''} onChange={e => set('format', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" value={row.date ?? ''} onChange={e => set('date', e.target.value)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="hook">Hook</Label>
          <Textarea id="hook" rows={3} value={row.hook ?? ''} onChange={e => set('hook', e.target.value)} />
        </div>

        <div className="space-y-2 max-w-xs">
          <Label>Status</Label>
          <Select value={row.status} onValueChange={v => set('status', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PIPELINE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} value={row.notes ?? ''} onChange={e => set('notes', e.target.value)} />
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> Save changes
          </Button>
          <Button variant="outline" onClick={pushToCalendar} disabled={saving}>
            <CalendarPlus className="h-4 w-4 mr-1" /> Push to Calendar
          </Button>
        </div>
      </Card>
    </>
  );
}
