-- Create pace_milestones table for tracking weekly AI transformation predictions
CREATE TABLE public.pace_milestones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  program_start_date DATE NOT NULL,
  week_number INTEGER NOT NULL,
  target_weight NUMERIC,
  ai_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT pace_milestones_status_check CHECK (status IN ('pending', 'generated', 'compared'))
);

-- Enable RLS
ALTER TABLE public.pace_milestones ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own pace milestones"
ON public.pace_milestones FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own pace milestones"
ON public.pace_milestones FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pace milestones"
ON public.pace_milestones FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own pace milestones"
ON public.pace_milestones FOR DELETE
USING (auth.uid() = user_id);

-- Add PACE mode columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS program_start_date DATE,
ADD COLUMN IF NOT EXISTS program_duration_weeks INTEGER DEFAULT 12,
ADD COLUMN IF NOT EXISTS pace_mode_enabled BOOLEAN DEFAULT false;