-- Add reference_video_url column to exercises table for motion control video generation
ALTER TABLE public.exercises 
ADD COLUMN IF NOT EXISTS reference_video_url text;