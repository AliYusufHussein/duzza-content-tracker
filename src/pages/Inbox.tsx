import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Search, ArrowDownAZ, ArrowUpAZ, Eye, Send, XCircle, Inbox } from 'lucide-react';
import { toast } from 'sonner';

type InboxItem = {
  id: string;
  title: string | null;
  content: string | null;
  channel: string | null;
  platform: string | null;
  source: string | null;
  status: string;
  date: string | null;
  created_at: string;
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'sent', label: 'Sent' },
  { value: 'dismissed', label: 'Dismissed' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
];

function statusBadge(status: string) {
  switch (status) {
    case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pending</Badge>;
    case 'sent': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Sent</Badge>;
    case 'dismissed': return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">Dismissed</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function InboxPage() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sort, setSort] = useState('newest');
  const [viewing, setViewing] = useState<InboxItem | null>(null);
  const [sending, setSending] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('inbox')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error(error); toast.error(error.message); }
    else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let result = items
      .filter(i => statusFilter === 'all' || i.status === statusFilter)
      .filter(i => {
        if (!q) return true;
        const hay = `${i.title ?? ''} ${i.content ?? ''} ${i.channel ?? ''} ${i.platform ?? ''}`.toLowerCase();
        return hay.includes(q.toLowerCase());
      });
    result = result.sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sort === 'oldest' ? ta - tb : tb - ta;
    });
    return result;
  }, [items, q, statusFilter, sort]);

  const sendToPipeline = async () => {
    if (!viewing) return;
    setSending(true);
    const content = viewing.content ?? '';
    const { error: insErr } = await supabase.from('pipeline').insert({
      idea: viewing.title ?? content.slice(0, 100),
      hook: content.slice(0, 280),
      channel: viewing.channel ?? null,
      platform: viewing.platform ?? null,
      date: viewing.date ?? format(new Date(), 'yyyy-MM-dd'),
      status: 'Polishing',
      notes: 'From Polisher',
    });
    if (insErr) { setSending(false); toast.error(insErr.message); return; }
    const { error: updErr } = await supabase.from('inbox').update({ status: 'sent' }).eq('id', viewing.id);
    setSending(false);
    if (updErr) { toast.error(updErr.message); return; }
    toast.success('Added to Pipeline ✓');
    setViewing(null);
    load();
  };

  const dismissItem = async (id: string) => {
    const { error } = await supabase.from('inbox').update({ status: 'dismissed' }).eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Dismissed');
    load();
  };

  const counts = useMemo(() => ({
    all: items.length,
    pending: items.filter(i => i.status === 'pending').length,
    sent: items.filter(i => i.status === 'sent').length,
    dismissed: items.filter(i => i.status === 'dismissed').length,
  }), [items]);

  return (
    <>
      <PageHeader
        title="Inbox"
        subtitle={`${counts.pending} pending · ${counts.sent} sent · ${counts.dismissed} dismissed`}
      />

      {/* Filters */}
      <Card className="p-3 mb-4 surface-card flex flex-col sm:flex-row gap-2">
        <div className="relative sm:max-w-sm flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search title, content, channel, platform…"
            value={q}
            onChange={e => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.label} {o.value !== 'all' && `(${counts[o.value as keyof typeof counts]})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="sm:w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>
                {o.value === 'newest' ? <ArrowDownAZ className="h-3.5 w-3.5 mr-1 inline" /> : <ArrowUpAZ className="h-3.5 w-3.5 mr-1 inline" />}
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="sm:ml-auto">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </div>
      </Card>

      {/* Table */}
      <Card className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3 font-medium">Title / Content</th>
                <th className="px-4 py-3 font-medium">Channel · Platform</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Received</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <Inbox className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm font-medium">No items found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {items.length === 0 ? 'Inbox is empty.' : 'Try changing your filters.'}
                    </p>
                  </td>
                </tr>
              )}
              {filtered.map(i => (
                <tr key={i.id} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="px-4 py-3 align-top max-w-md">
                    <div className="font-medium line-clamp-1">{i.title ?? '—'}</div>
                    {i.content && (
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{i.content}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-xs">
                    <div>{i.channel ?? '—'}</div>
                    <div className="text-muted-foreground">{i.platform ?? '—'}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted-foreground font-mono">
                    {i.date ?? '—'}
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                    {i.created_at ? formatDistanceToNow(new Date(i.created_at), { addSuffix: true }) : '—'}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {statusBadge(i.status)}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => setViewing(i)}
                      >
                        <Eye className="h-3 w-3 mr-1" /> View
                      </Button>
                      {i.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-muted-foreground hover:text-destructive"
                          onClick={() => dismissItem(i.id)}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Dismiss
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* View Modal */}
      <Dialog open={!!viewing} onOpenChange={o => !o && setViewing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-base">{viewing?.title ?? 'Inbox item'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Content</Label>
              <Textarea readOnly value={viewing?.content ?? ''} className="min-h-[200px] font-mono text-xs" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="v-channel">Channel</Label>
                <Input id="v-channel" value={viewing?.channel ?? ''} readOnly />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="v-platform">Platform</Label>
                <Input id="v-platform" value={viewing?.platform ?? ''} readOnly />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-date">Date</Label>
              <Input id="v-date" type="date" value={viewing?.date ?? ''} readOnly />
            </div>
          </div>
          <DialogFooter>
            {viewing?.status === 'pending' ? (
              <>
                <Button variant="outline" onClick={() => { dismissItem(viewing.id); setViewing(null); }}>
                  Dismiss
                </Button>
                <Button onClick={sendToPipeline} disabled={sending}>
                  <Send className="h-4 w-4 mr-1" /> Send to Pipeline
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
