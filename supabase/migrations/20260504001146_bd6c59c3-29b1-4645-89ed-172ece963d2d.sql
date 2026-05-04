
-- 1. Rename status in existing pipeline rows
UPDATE public.pipeline SET status = 'Polishing' WHERE status = 'Repurposed';

-- 2. polisher_queue table
CREATE TABLE public.polisher_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID REFERENCES public.pipeline(id) ON DELETE CASCADE,
  idea TEXT,
  channel TEXT,
  platform TEXT,
  format TEXT,
  hook TEXT,
  article_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.polisher_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "polisher_queue_auth_all"
ON public.polisher_queue
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_polisher_queue_updated_at
BEFORE UPDATE ON public.polisher_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Add source column to calendar
ALTER TABLE public.calendar ADD COLUMN source TEXT DEFAULT 'manual';
UPDATE public.calendar SET source = 'manual' WHERE source IS NULL;
