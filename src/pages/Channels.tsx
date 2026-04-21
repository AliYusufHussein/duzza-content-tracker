import { useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTable } from '@/hooks/useTable';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { RecordDialog, FieldDef } from '@/components/RecordDialog';
import { Button } from '@/components/ui/button';
import { Trash2, ExternalLink, Pencil, Plus } from 'lucide-react';
import { PLATFORMS, PILLARS } from '@/lib/automation';
import BulkCalendarUpload from '@/components/BulkCalendarUpload';
import { toast } from 'sonner';

export default function ChannelsPage() {
  const { rows, refresh } = useTable<any>('channels', 'category', true);

  const fields: FieldDef[] = [
    { name: 'category', label: 'Category', type: 'select', options: PILLARS as any, required: true },
    { name: 'brand', label: 'Brand / Channel name', type: 'text', required: true },
    { name: 'platform', label: 'Platform', type: 'select', options: PLATFORMS as any, required: true },
    { name: 'link', label: 'Link', type: 'url' },
    { name: 'notes', label: 'Notes', type: 'textarea' },
  ];

  const grouped = useMemo(() => {
    const map: Record<string, any[]> = {};
    rows.forEach(r => { (map[r.brand] ??= []).push(r); });
    return Object.entries(map).map(([brand, list]) => ({
      brand, category: list[0].category, channels: list,
    }));
  }, [rows]);

  const create = async (v: any) => {
    const { error } = await supabase.from('channels').insert(v);
    if (error) toast.error(error.message); else { toast.success('Channel added'); refresh(); }
  };
  const update = async (id: string, v: any) => {
    const { error } = await supabase.from('channels').update(v).eq('id', id);
    if (error) toast.error(error.message); else { toast.success('Updated'); refresh(); }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from('channels').delete().eq('id', id);
    if (error) toast.error(error.message); else refresh();
  };

  return (
    <>
      <PageHeader
        title="Channels"
        subtitle="Every brand and every platform you publish to. Click any link row to edit details."
        action={<RecordDialog title="Add a channel" fields={fields} onSubmit={create} />}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {grouped.map(g => (
          <Card key={g.brand} className="p-5 surface-card">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <div className="text-base font-semibold tracking-tight">{g.brand}</div>
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground mt-0.5">{g.category}</div>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-mono text-muted-foreground mr-1">{g.channels.length} platform{g.channels.length !== 1 && 's'}</span>
                <BulkCalendarUpload brand={g.brand} platforms={g.channels} onDone={refresh} />
                <RecordDialog
                  title={`Add platform to ${g.brand}`}
                  fields={fields}
                  onSubmit={create}
                  trigger={
                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Add another platform">
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  }
                  initial={{ category: g.category, brand: g.brand }}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              {g.channels.map(c => (
                <div key={c.id} className="flex items-center justify-between rounded-md border border-border bg-secondary/30 px-2.5 py-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-medium">{c.platform}</span>
                    {c.link && <a href={c.link} target="_blank" rel="noreferrer" className="text-[11px] text-muted-foreground hover:text-foreground truncate flex items-center gap-1">
                      <ExternalLink className="h-3 w-3 shrink-0" /> <span className="truncate max-w-[180px]">{c.link.replace(/^https?:\/\//, '')}</span>
                    </a>}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <RecordDialog
                      title={`Edit ${c.brand} · ${c.platform}`}
                      fields={fields}
                      onSubmit={(v) => update(c.id, v)}
                      initial={c}
                      submitLabel="Save changes"
                      trigger={
                        <Button size="icon" variant="ghost" className="h-6 w-6" title="Edit">
                          <Pencil className="h-3 w-3 text-muted-foreground" />
                        </Button>
                      }
                    />
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => remove(c.id)} title="Delete">
                      <Trash2 className="h-3 w-3 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
