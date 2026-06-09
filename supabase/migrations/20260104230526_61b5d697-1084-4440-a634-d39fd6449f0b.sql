-- Add face photo URL column to profiles table for face preservation in transformations
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS face_photo_url TEXT;