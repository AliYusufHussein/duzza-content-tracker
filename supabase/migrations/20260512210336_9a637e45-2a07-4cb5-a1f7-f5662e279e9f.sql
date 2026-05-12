CREATE TABLE public.inbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  content TEXT,
  channel TEXT,
  platform TEXT,
  source TEXT DEFAULT 'polisher',
  status TEXT NOT NULL DEFAULT 'pending',
  date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.inbox ENABLE ROW LEVEL SECURITY;
CREATE POLICY "inbox_all" ON public.inbox FOR ALL USING (true) WITH CHECK (true);
CREATE TRIGGER trg_inbox_u BEFORE UPDATE ON public.inbox
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();