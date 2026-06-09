-- Create progress_photos table for tracking user progress over time
CREATE TABLE public.progress_photos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  photo_url TEXT NOT NULL,
  photo_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  weight_at_time DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own progress photos"
ON public.progress_photos FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress photos"
ON public.progress_photos FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress photos"
ON public.progress_photos FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress photos"
ON public.progress_photos FOR UPDATE USING (auth.uid() = user_id);