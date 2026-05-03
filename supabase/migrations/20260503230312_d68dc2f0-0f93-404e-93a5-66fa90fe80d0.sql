-- 1. Drop unused tables (safe: no code references)
DROP TABLE IF EXISTS public.brand_voice CASCADE;
DROP TABLE IF EXISTS public.content_pillars CASCADE;
DROP TABLE IF EXISTS public.kpi_log CASCADE;
DROP TABLE IF EXISTS public.weekly_review CASCADE;

-- 2. Trigger: cap pipeline_drafts.body to 20k chars + keep last 20 versions per pipeline_id
CREATE OR REPLACE FUNCTION public.enforce_pipeline_drafts_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cap body length
  IF NEW.body IS NOT NULL AND length(NEW.body) > 20000 THEN
    NEW.body := left(NEW.body, 20000);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS pipeline_drafts_cap_body ON public.pipeline_drafts;
CREATE TRIGGER pipeline_drafts_cap_body
BEFORE INSERT OR UPDATE ON public.pipeline_drafts
FOR EACH ROW EXECUTE FUNCTION public.enforce_pipeline_drafts_limits();

CREATE OR REPLACE FUNCTION public.prune_pipeline_drafts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.pipeline_drafts
  WHERE pipeline_id = NEW.pipeline_id
    AND id NOT IN (
      SELECT id FROM public.pipeline_drafts
      WHERE pipeline_id = NEW.pipeline_id
      ORDER BY created_at DESC
      LIMIT 20
    );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS pipeline_drafts_prune ON public.pipeline_drafts;
CREATE TRIGGER pipeline_drafts_prune
AFTER INSERT ON public.pipeline_drafts
FOR EACH ROW EXECUTE FUNCTION public.prune_pipeline_drafts();