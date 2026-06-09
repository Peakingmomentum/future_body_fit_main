-- Allow admins to upload exercise videos
CREATE POLICY "Admins can upload exercise videos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'user-photos' 
  AND (storage.foldername(name))[1] = 'exercise-videos'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to update exercise videos
CREATE POLICY "Admins can update exercise videos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'user-photos' 
  AND (storage.foldername(name))[1] = 'exercise-videos'
  AND public.has_role(auth.uid(), 'admin')
);

-- Allow admins to delete exercise videos
CREATE POLICY "Admins can delete exercise videos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'user-photos' 
  AND (storage.foldername(name))[1] = 'exercise-videos'
  AND public.has_role(auth.uid(), 'admin')
);