import { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Sparkles, Save, Copy, History, RotateCcw, Trash2, Loader2, CalendarPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { formatDistanceToNow, format } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Friendly model name from gateway slug like "google/gemini-3-flash-preview"
function shortModel(model: string | null | undefined): string | null {
  if (!model) return null;
  const tail = model.includes('/') ? model.split('/').pop()! : model;
  return tail
    .replace(/-preview$/i, '')
    .replace(/-/g, ' ')
    .replace(/\bgemini\b/i, 'Gemini')
    .replace(/\bgpt\b/i, 'GPT')
    .replace(/\bflash\b/i, 'Flash')
    .replace(/\bpro\b/i, 'Pro')
    .replace(/\blite\b/i, 'Lite')
    .replace(/\bmini\b/i, 'Mini')
    .replace(/\bnano\b/i, 'Nano');
}

function actionLabel(d: { source: string }, isFirstAi: boolean): string {
  if (d.source === 'ai') return isFirstAi ? 'Generated' : 'Regenerated';
  return 'Manual save';
}

type Draft = {
  id: string;
  pipeline_id: string;
  body: string;
  source: string;
  model: string | null;
  created_at: string;
};

export function DraftSheet({
  row,
  open,
  onOpenChange,
}: {
  row: any | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [body, setBody] = useState('');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pushing, setPushing] = useState<{ date: string } | null>(null);

  // Load drafts when row changes
  useEffect(() => {
    if (!row?.id || !open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('pipeline_drafts')
        .select('*')
        .eq('pipeline_id', row.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
      } else {
        setDrafts(data ?? []);
        setBody(data?.[0]?.body ?? '');
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [row?.id, open]);

  if (!row) return null;

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-draft', {
        body: {
          idea: row.idea,
          hook: row.hook,
          channel: row.channel,
          platform: row.platform,
          pillar: row.pillar,
          format: row.format,
          notes: row.notes,
        },
      });
      if (error) throw error;
      const draft = (data as any)?.draft as string;
      const model = (data as any)?.model as string;
      if (!draft) throw new Error('Empty draft returned');

      const { data: inserted, error: insErr } = await supabase
        .from('pipeline_drafts')
        .insert({ pipeline_id: row.id, body: draft, source: 'ai', model })
        .select()
        .single();
      if (insErr) throw insErr;

      setBody(draft);
      setDrafts(prev => [inserted as Draft, ...prev]);
      toast.success('Draft generated');
    } catch (e: any) {
      const msg = e?.message ?? 'Generation failed';
      if (msg.includes('Rate limit')) toast.error(msg);
      else if (msg.includes('credits')) toast.error(msg);
      else toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const saveManual = async () => {
    if (!body.trim()) { toast.error('Draft is empty'); return; }
    const latest = drafts[0];
    if (latest && latest.body === body) {
      toast.info('No changes to save');
      return;
    }
    const { data, error } = await supabase
      .from('pipeline_drafts')
      .insert({ pipeline_id: row.id, body, source: 'manual' })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setDrafts(prev => [data as Draft, ...prev]);
    toast.success('Saved as new version');
  };

  const restore = (d: Draft) => {
    setBody(d.body);
    toast.success('Restored — edit and save to keep it as the latest version');
  };

  const removeDraft = async (id: string) => {
    const { error } = await supabase.from('pipeline_drafts').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setDrafts(prev => prev.filter(d => d.id !== id));
    toast.success('Version deleted');
  };

  const copy = async () => {
    if (!body) return;
    await navigator.clipboard.writeText(body);
    toast.success('Copied');
  };

  const confirmPushToCalendar = async () => {
    if (!pushing) return;
    if (!body.trim()) { toast.error('Draft is empty'); return; }
    if (!pushing.date) { toast.error('Pick a date'); return; }
    // Save current body as a manual version if it differs from latest
    const latest = drafts[0];
    if (!latest || latest.body !== body) {
      await supabase.from('pipeline_drafts').insert({ pipeline_id: row.id, body, source: 'manual' });
    }
    const { error: insErr } = await supabase.from('calendar').insert({
      date: pushing.date,
      channel: row.channel ?? null,
      platform: row.platform ?? null,
      content: body,
      status: 'Scheduled',
      notes: row.notes ?? null,
    });
    if (insErr) { toast.error(insErr.message); return; }
    const { error: delErr } = await supabase.from('pipeline').delete().eq('id', row.id);
    if (delErr) { toast.error(delErr.message); return; }
    toast.success('Pushed to calendar');
    setPushing(null);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl flex flex-col gap-0 p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="text-base font-semibold tracking-tight pr-8 line-clamp-2">{row.idea}</SheetTitle>
          <SheetDescription className="flex flex-wrap gap-1.5 mt-2">
            {row.channel && <Badge variant="outline" className="text-xs">{row.channel}</Badge>}
            {row.platform && <Badge variant="outline" className="text-xs">{row.platform}</Badge>}
            {row.pillar && <Badge variant="outline" className="text-xs">{row.pillar}</Badge>}
            {row.format && <Badge variant="outline" className="text-xs">{row.format}</Badge>}
            <Badge variant="secondary" className="text-xs">{row.status}</Badge>
          </SheetDescription>
          {row.hook && (
            <div className="mt-2 text-xs italic text-muted-foreground border-l-2 border-border pl-2">
              ↳ {row.hook}
            </div>
          )}
        </SheetHeader>

        <div className="flex items-center gap-2 px-6 py-3 border-b border-border bg-secondary/30">
          <Button size="sm" onClick={generate} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? 'Generating…' : drafts.length === 0 ? 'Generate draft' : 'Regenerate'}
          </Button>
          <Button size="sm" variant="outline" onClick={saveManual} disabled={!body.trim()}>
            <Save className="h-4 w-4" />Save version
          </Button>
          <Button size="sm" variant="ghost" onClick={copy} disabled={!body.trim()}>
            <Copy className="h-4 w-4" />Copy
          </Button>
          <Button
            size="sm"
            variant="default"
            onClick={() => setPushing({ date: row.date || new Date().toISOString().slice(0, 10) })}
            disabled={!body.trim()}
            title="Move this item to the calendar with the current draft as content"
          >
            <CalendarPlus className="h-4 w-4" />Push to calendar
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => setShowHistory(v => !v)}
            disabled={drafts.length === 0}
          >
            <History className="h-4 w-4" />
            {drafts.length} {drafts.length === 1 ? 'version' : 'versions'}
          </Button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 flex flex-col p-6 min-w-0">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Draft</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={loading ? 'Loading…' : 'Click "Generate draft" to start, or write your own.'}
              className="flex-1 resize-none font-mono text-sm leading-relaxed"
            />
            <div className="text-[10px] text-muted-foreground mt-2 font-mono">
              {body.length} chars · {body.trim().split(/\s+/).filter(Boolean).length} words
            </div>
          </div>

          {showHistory && (
            <div className="w-72 border-l border-border bg-secondary/20 flex flex-col">
              <div className="px-4 py-3 border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                Version history
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2 space-y-2">
                  {drafts.length === 0 && (
                    <div className="text-xs text-muted-foreground p-3">No versions yet.</div>
                  )}
                  <TooltipProvider delayDuration={200}>
                    {drafts.map((d, i) => {
                      const versionNumber = drafts.length - i;
                      // Find if this is the very first AI draft chronologically
                      const firstAiIndex = [...drafts].reverse().findIndex(x => x.source === 'ai');
                      const firstAiId = firstAiIndex >= 0 ? [...drafts].reverse()[firstAiIndex]?.id : null;
                      const isFirstAi = d.source === 'ai' && d.id === firstAiId;
                      const action = actionLabel(d, isFirstAi);
                      const model = shortModel(d.model);
                      const created = new Date(d.created_at);
                      return (
                        <div key={d.id} className="rounded border border-border bg-background p-2.5 space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-mono">
                              v{versionNumber}
                            </Badge>
                            <Badge variant={d.source === 'ai' ? 'default' : 'secondary'} className="text-[10px] h-4 px-1.5">
                              {action}
                            </Badge>
                            {i === 0 && <Badge variant="outline" className="text-[10px] h-4 px-1.5">Latest</Badge>}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            {model && <span className="font-mono truncate" title={d.model ?? ''}>{model}</span>}
                            {model && <span>·</span>}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">{formatDistanceToNow(created, { addSuffix: true })}</span>
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-[10px] font-mono">
                                {format(created, 'PPpp')}
                              </TooltipContent>
                            </Tooltip>
                            <span className="ml-auto font-mono">{d.body.length}c</span>
                          </div>
                          <div className="text-xs line-clamp-3 text-muted-foreground whitespace-pre-wrap">
                            {d.body}
                          </div>
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => restore(d)}>
                              <RotateCcw className="h-3 w-3" />Restore
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-auto" onClick={() => removeDraft(d.id)}>
                              <Trash2 className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </TooltipProvider>
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
