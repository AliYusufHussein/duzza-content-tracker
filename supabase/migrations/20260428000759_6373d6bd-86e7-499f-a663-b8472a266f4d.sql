CREATE TABLE public.pipeline_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id uuid NOT NULL REFERENCES public.pipeline(id) ON DELETE CASCADE,
  body text NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  model text,
  prompt_meta jsonb,
  owner_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_drafts_pipeline_id ON public.pipeline_drafts(pipeline_id, created_at DESC);

ALTER TABLE public.pipeline_drafts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pipeline_drafts_auth_all"
ON public.pipeline_drafts
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);