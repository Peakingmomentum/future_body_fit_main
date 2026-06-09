import { useState } from 'react';
import { format } from 'date-fns';
import { Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ProgressPhoto } from '@/hooks/useProgressPhotos';

interface ProgressPhotoGalleryProps {
  photos: ProgressPhoto[];
  onDelete: (id: string) => Promise<void>;
}

export function ProgressPhotoGallery({ photos, onDelete }: ProgressPhotoGalleryProps) {
  const [open, setOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  const goNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  };

  const goPrev = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    }
  };

  if (photos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No progress photos yet. Start tracking your journey!
      </p>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="link" size="sm" className="p-0 h-auto">
            View All Photos ({photos.length})
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Progress Photo Gallery</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-1">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative group cursor-pointer"
                  onClick={() => setSelectedIndex(index)}
                >
                  <img
                    src={photo.photo_url}
                    alt={`Progress ${format(new Date(photo.photo_date), 'MMM d, yyyy')}`}
                    className="w-full h-32 object-cover rounded-lg"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 rounded-b-lg">
                    <p className="text-xs text-white font-medium">
                      {format(new Date(photo.photo_date), 'MMM d, yyyy')}
                    </p>
                    {photo.weight_at_time && (
                      <p className="text-xs text-white/80">{photo.weight_at_time} lbs</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Full size photo viewer */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          {selectedPhoto && (
            <div className="relative">
              <img
                src={selectedPhoto.photo_url}
                alt="Progress photo"
                className="w-full max-h-[70vh] object-contain"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-8 w-8"
                  onClick={() => {
                    onDelete(selectedPhoto.id);
                    setSelectedIndex(null);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={() => setSelectedIndex(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {selectedIndex !== null && selectedIndex > 0 && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10"
                  onClick={goPrev}
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
              )}
              
              {selectedIndex !== null && selectedIndex < photos.length - 1 && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10"
                  onClick={goNext}
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              )}

              <div className="p-4 bg-background">
                <p className="font-medium">
                  {format(new Date(selectedPhoto.photo_date), 'MMMM d, yyyy')}
                </p>
                {selectedPhoto.weight_at_time && (
                  <p className="text-sm text-muted-foreground">Weight: {selectedPhoto.weight_at_time} lbs</p>
                )}
                {selectedPhoto.notes && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedPhoto.notes}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
