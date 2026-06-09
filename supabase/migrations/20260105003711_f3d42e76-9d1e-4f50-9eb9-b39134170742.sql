-- Add original_photo_url column to store the first "before" photo (never changes)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS original_photo_url TEXT;