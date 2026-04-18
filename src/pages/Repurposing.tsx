import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTable } from '@/hooks/useTable';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { RecordDialog, FieldDef } from '@/components/RecordDialog';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink, ArrowRight } from 'lucide-react';
import { PLATFORMS, FORMATS, repurposingPath } from '@/lib/automation';
import { toast } from 'sonner';

const STATUSES = ['Planned', 'Drafting', 'Posted', 'Done'];

export default function RepurposingPage() {
  const { rows, refresh } = useTable<any>('repurposing', 'created_at', false);

  const fields: FieldDef[] = [
    { name: 'original_post', label: 'Original post (title or URL)', type: 'text', required: true },
    { name: 'source_platform', label: 'Source platform', type: 'select', options: PLATFORMS as any },
    { name: 'new_format', label: 'New format', type: 'select', options: FORMATS as any },
    { name: 'target_platform', label: 'Target platform', type: 'select', options: PLATFORMS as any },
    { name: 'status', label: 'Status', type: 'select', options: STATUSES, defaultValue: 'Planned' },
    { name: 'link', label: 'Link', type: 'url' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const remove = async (id: string) => {
    const { error } = await supabase.from('repurposing').delete().eq('id', id);
    if (error) toast.error(error.message); else refresh();
  };
  const create = async (v: any) => {
    const { error } = await supabase.from('repurposing').insert(v);
    if (error) toast.error(error.message); else { toast.success('Repurposing logged'); refresh(); }
  };

  // suggestions: get unique source platforms used and show repurposing path
  const suggestions = useMemo(() => {
    const set = new Set<string>(rows.map(r => r.source_platform).filter(Boolean));
    if (set.size === 0) PLATFORMS.forEach(p => set.add(p));
    return Array.from(set).slice(0, 4).map(p => ({ from: p, path: repurposingPath(p) }));
  }, [rows]);

  return (
    <>
      <PageHeader
        title="Repurposing Engine"
        subtitle="Squeeze every drop from each post. Suggested flows: Video → Carousel → Thread → Blog · Twitter → Telegram → Blog."
        action={<RecordDialog title="Log a repurpose" fields={fields} onSubmit={create} />}
      />

      <Card className="p-4 mb-4 surface-card">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Suggested paths</div>
        <div className="flex flex-wrap gap-3">
          {suggestions.map(s => (
            <div key={s.from} className="flex items-center gap-1.5 rounded-md border border-border bg-secondary/40 px-3 py-1.5 text-xs">
              <span className="font-medium">{s.from}</span>
              {s.path.map((p, idx) => (
                <span key={idx} className="flex items-center gap-1.5 text-muted-foreground">
                  <ArrowRight className="h-3 w-3" /> {p}
                </span>
              ))}
            </div>
          ))}
        </div>
      </Card>

      <Card className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-4 py-3 font-medium">Original</th>
                <th className="px-4 py-3 font-medium">Flow</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">No repurposes logged yet.</td></tr>
              )}
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-secondary/40">
                  <td className="px-4 py-3 max-w-xs">
                    <div className="font-medium truncate">{r.original_post}</div>
                    {r.notes && <div className="text-xs text-muted-foreground line-clamp-1">{r.notes}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-1.5 py-0.5 rounded bg-secondary">{r.source_platform ?? '—'}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="px-1.5 py-0.5 rounded bg-secondary">{r.new_format ?? '—'}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                      <span className="px-1.5 py-0.5 rounded bg-secondary">{r.target_platform ?? '—'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge value={r.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {r.link && <a href={r.link} target="_blank" rel="noreferrer" className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"><ExternalLink className="h-3.5 w-3.5" /></a>}
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
