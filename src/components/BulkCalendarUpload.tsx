import { useState } from 'react';
import Papa from 'papaparse';
import { format, addDays } from 'date-fns';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

type Props = {
  brand: string;
  platforms: { platform: string }[];
  onDone?: () => void;
  trigger?: React.ReactNode;
};

const CADENCES = [
  { label: 'Daily', value: '1' },
  { label: 'Mon/Wed/Fri', value: 'mwf' },
  { label: 'Every 2 days', value: '2' },
  { label: 'Weekly', value: '7' },
];

export default function BulkCalendarUpload({ brand, platforms, onDone, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  // paste
  const [pasteText, setPasteText] = useState('');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [cadence, setCadence] = useState('mwf');
  const [platform, setPlatform] = useState(platforms[0]?.platform ?? '');

  const computeDates = (count: number, start: Date, cad: string): Date[] => {
    const out: Date[] = [];
    let cur = new Date(start);
    if (cad === 'mwf') {
      while (out.length < count) {
        const d = cur.getDay(); // 1=Mon,3=Wed,5=Fri
        if (d === 1 || d === 3 || d === 5) out.push(new Date(cur));
        cur = addDays(cur, 1);
      }
    } else {
      const step = parseInt(cad, 10) || 1;
      for (let i = 0; i < count; i++) out.push(addDays(start, i * step));
    }
    return out;
  };

  const submitPaste = async () => {
    const lines = pasteText.split('\n').map(s => s.trim()).filter(Boolean);
    if (!lines.length) return toast.error('Paste at least one item');
    if (!platform) return toast.error('Pick a platform');
    setBusy(true);
    const dates = computeDates(lines.length, new Date(startDate), cadence);
    const rows = lines.map((content, i) => ({
      content, date: format(dates[i], 'yyyy-MM-dd'),
      platform, channel: brand, status: 'Planned',
    }));
    const { error } = await supabase.from('calendar').insert(rows);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Scheduled ${rows.length} posts for ${brand}`);
    setPasteText('');
    setOpen(false);
    onDone?.();
  };

  const submitCsv = (file: File) => {
    setBusy(true);
    Papa.parse<any>(file, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const rows = res.data
          .map((r: any) => ({
            content: r.content || r.Content || r.title || '',
            date: r.date || r.Date || '',
            platform: r.platform || r.Platform || platform,
            notes: r.notes || r.Notes || null,
            channel: brand,
            status: r.status || 'Planned',
          }))
          .filter(r => r.content && r.date);
        if (!rows.length) { setBusy(false); return toast.error('CSV needs columns: date, content, platform (notes optional)'); }
        const { error } = await supabase.from('calendar').insert(rows);
        setBusy(false);
        if (error) return toast.error(error.message);
        toast.success(`Imported ${rows.length} posts for ${brand}`);
        setOpen(false);
        onDone?.();
      },
      error: () => { setBusy(false); toast.error('Could not parse CSV'); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm" variant="outline" className="h-7 text-xs"><Upload className="h-3 w-3 mr-1" />Upload</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Upload calendar · {brand}</DialogTitle></DialogHeader>
        <Tabs defaultValue="paste">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="paste">Paste list</TabsTrigger>
            <TabsTrigger value="csv">CSV file</TabsTrigger>
          </TabsList>

          <TabsContent value="paste" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Platform</Label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {platforms.map(p => <SelectItem key={p.platform} value={p.platform}>{p.platform}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Cadence</Label>
                <Select value={cadence} onValueChange={setCadence}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CADENCES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Start date</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">One post per line</Label>
              <Textarea rows={8} value={pasteText} onChange={e => setPasteText(e.target.value)}
                placeholder={"Hook idea 1\nHook idea 2\nHook idea 3"} />
            </div>
            <DialogFooter>
              <Button onClick={submitPaste} disabled={busy}>{busy ? 'Saving…' : 'Schedule posts'}</Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="csv" className="space-y-3 mt-3">
            <p className="text-xs text-muted-foreground">
              CSV columns: <code className="text-foreground">date, content, platform, notes</code> (notes optional). Dates as YYYY-MM-DD.
            </p>
            <Input type="file" accept=".csv" onChange={e => e.target.files?.[0] && submitCsv(e.target.files[0])} disabled={busy} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
