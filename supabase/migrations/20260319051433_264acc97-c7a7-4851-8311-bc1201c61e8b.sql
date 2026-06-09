-- Create the exercise-gifs storage bucket (public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercise-gifs', 'exercise-gifs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to exercise GIFs
CREATE POLICY "Exercise GIFs are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercise-gifs');

-- Allow service role to upload exercise GIFs
CREATE POLICY "Service role can upload exercise GIFs"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'exercise-gifs');

-- Allow service role to update exercise GIFs
CREATE POLICY "Service role can update exercise GIFs"
ON storage.objects FOR UPDATE
USING (bucket_id = 'exercise-gifs');

-- Allow service role to delete exercise GIFs
CREATE POLICY "Service role can delete exercise GIFs"
ON storage.objects FOR DELETE
USING (bucket_id = 'exercise-gifs');