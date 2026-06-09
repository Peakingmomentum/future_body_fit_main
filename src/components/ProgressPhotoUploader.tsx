import { useState, useRef } from 'react';
import { Camera, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface ProgressPhotoUploaderProps {
  onUpload: (file: File, notes?: string, weight?: number) => Promise<any>;
  isUploading: boolean;
}

export function ProgressPhotoUploader({ onUpload, isUploading }: ProgressPhotoUploaderProps) {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const [weight, setWeight] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!file) return;
    const result = await onUpload(file, notes || undefined, weight ? parseFloat(weight) : undefined);
    if (result) {
      setOpen(false);
      setPreview(null);
      setFile(null);
      setNotes('');
      setWeight('');
    }
  };

  const clearPreview = () => {
    setPreview(null);
    setFile(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Camera className="h-4 w-4" />
          Upload Progress Photo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Progress Photo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Preview" className="w-full h-64 object-cover rounded-lg" />
              <Button
                size="icon"
                variant="destructive"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={clearPreview}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-muted-foreground/25 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-10 w-10 text-muted-foreground mb-2" />
              <span className="text-sm text-muted-foreground">Click to upload photo</span>
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          )}

          <div className="space-y-2">
            <Label htmlFor="weight">Current Weight (optional)</Label>
            <Input
              id="weight"
              type="number"
              placeholder="Enter weight in lbs"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Input
              id="notes"
              placeholder="How are you feeling?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!file || isUploading}
          >
            {isUploading ? 'Uploading...' : 'Save Progress Photo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
