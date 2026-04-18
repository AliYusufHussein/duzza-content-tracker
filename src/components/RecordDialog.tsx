import { ReactNode, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';

export type FieldDef = {
  name: string;
  label: string;
  type?: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'url';
  options?: readonly string[] | string[];
  required?: boolean;
  defaultValue?: any;
  placeholder?: string;
};

export function RecordDialog({
  title, fields, onSubmit, trigger, initial, submitLabel = 'Save',
}: {
  title: string;
  fields: FieldDef[];
  onSubmit: (values: Record<string, any>) => Promise<void> | void;
  trigger?: ReactNode;
  initial?: Record<string, any>;
  submitLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<Record<string, any>>(() => {
    const v: Record<string, any> = {};
    fields.forEach(f => v[f.name] = initial?.[f.name] ?? f.defaultValue ?? '');
    return v;
  });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const out: Record<string, any> = {};
      for (const f of fields) {
        let val = values[f.name];
        if (f.type === 'number') val = val === '' || val == null ? null : Number(val);
        if (val === '') val = null;
        out[f.name] = val;
      }
      await onSubmit(out);
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Add</Button>}
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          {fields.map(f => (
            <div key={f.name} className="space-y-1.5">
              <Label htmlFor={f.name} className="text-xs uppercase tracking-wider text-muted-foreground">
                {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
              </Label>
              {f.type === 'textarea' ? (
                <Textarea id={f.name} value={values[f.name] ?? ''} required={f.required}
                  placeholder={f.placeholder}
                  onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}
                  rows={3} />
              ) : f.type === 'select' ? (
                <Select value={values[f.name] ?? ''} onValueChange={val => setValues(v => ({ ...v, [f.name]: val }))}>
                  <SelectTrigger><SelectValue placeholder={f.placeholder ?? 'Select…'} /></SelectTrigger>
                  <SelectContent>
                    {(f.options ?? []).map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Input id={f.name} type={f.type ?? 'text'} value={values[f.name] ?? ''} required={f.required}
                  placeholder={f.placeholder}
                  onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} />
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
