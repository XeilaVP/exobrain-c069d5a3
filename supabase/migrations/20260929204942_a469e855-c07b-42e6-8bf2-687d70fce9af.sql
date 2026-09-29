ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS in_tasks boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_postits boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS in_calendar boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS calendar_at timestamptz,
  ADD COLUMN IF NOT EXISTS calendar_has_time boolean NOT NULL DEFAULT false;