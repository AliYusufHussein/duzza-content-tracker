-- Drop unused tables
DROP TABLE IF EXISTS public.ideas CASCADE;
DROP TABLE IF EXISTS public.repurposing CASCADE;
DROP TABLE IF EXISTS public.growth CASCADE;
DROP TABLE IF EXISTS public.posts CASCADE;

-- Add owner_id scaffolding (nullable for now)
ALTER TABLE public.pipeline ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.calendar ADD COLUMN IF NOT EXISTS owner_id uuid;
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Fix calendar default status: Scheduled instead of Planned
ALTER TABLE public.calendar ALTER COLUMN status SET DEFAULT 'Scheduled';

-- Transactional RPC: migrate any legacy Planned/Skipped calendar rows back to pipeline as Idea
CREATE OR REPLACE FUNCTION public.migrate_legacy_calendar_to_pipeline()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moved integer := 0;
BEGIN
  WITH legacy AS (
    SELECT * FROM public.calendar WHERE status IN ('Planned','Skipped')
  ), inserted AS (
    INSERT INTO public.pipeline (idea, channel, platform, notes, date, status, owner_id)
    SELECT content, channel, platform, notes, date, 'Idea', owner_id FROM legacy
    RETURNING id
  ), deleted AS (
    DELETE FROM public.calendar WHERE status IN ('Planned','Skipped') RETURNING id
  )
  SELECT count(*) INTO moved FROM deleted;
  RETURN moved;
END;
$$;