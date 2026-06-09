ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS external_video_url text;
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS video_source text DEFAULT 'none';