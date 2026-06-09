import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface ProgressPhoto {
  id: string;
  user_id: string;
  photo_url: string;
  photo_date: string;
  notes: string | null;
  weight_at_time: number | null;
  created_at: string;
}

export function useProgressPhotos() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [photos, setPhotos] = useState<ProgressPhoto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const fetchPhotos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('progress_photos')
        .select('*')
        .eq('user_id', user.id)
        .order('photo_date', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching progress photos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, [user]);

  const uploadPhoto = async (file: File, notes?: string, weightAtTime?: number) => {
    if (!user) return null;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/progress-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-photos')
        .getPublicUrl(fileName);

      const { data, error } = await supabase
        .from('progress_photos')
        .insert({
          user_id: user.id,
          photo_url: publicUrl,
          notes: notes || null,
          weight_at_time: weightAtTime || null,
        })
        .select()
        .single();

      if (error) throw error;

      setPhotos(prev => [data, ...prev]);
      toast({ title: 'Progress photo uploaded!' });
      return data;
    } catch (error: any) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const deletePhoto = async (id: string) => {
    if (!user) return;

    try {
      const photo = photos.find(p => p.id === id);
      if (photo) {
        const path = photo.photo_url.split('/user-photos/')[1];
        if (path) {
          await supabase.storage.from('user-photos').remove([path]);
        }
      }

      const { error } = await supabase
        .from('progress_photos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPhotos(prev => prev.filter(p => p.id !== id));
      toast({ title: 'Photo deleted' });
    } catch (error: any) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' });
    }
  };

  const latestPhoto = photos[0] || null;

  return {
    photos,
    latestPhoto,
    isLoading,
    isUploading,
    uploadPhoto,
    deletePhoto,
    refetch: fetchPhotos,
  };
}
