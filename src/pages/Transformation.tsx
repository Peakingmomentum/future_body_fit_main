import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AppNav } from '@/components/AppNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { Zap, Sparkles, ArrowRight, ArrowLeft, Loader2, Upload, Camera, X, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Transformation() {
  const [generating, setGenerating] = useState(false);
  const [transformationImage, setTransformationImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile, updateProfile } = useProfile();
  const { user, loading: authLoading } = useAuth();

  // Redirect to auth if not logged in
  if (!authLoading && !user) {
    navigate('/auth', { replace: true });
    return null;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  // Ensure image is portrait orientation (rotate if landscape)
  const ensurePortraitOrientation = (imageUrl: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // If already portrait or square, return as-is
        if (img.height >= img.width) {
          resolve(imageUrl);
          return;
        }
        
        // Landscape detected — rotate 90° clockwise to make portrait
        console.log(`Rotating landscape image (${img.width}x${img.height}) to portrait`);
        const canvas = document.createElement('canvas');
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imageUrl);
          return;
        }
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve(imageUrl);
      img.src = imageUrl;
    });
  };

  // Normalize image orientation using canvas (fixes EXIF rotation issues)
  const normalizeImageOrientation = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Could not convert canvas to blob'));
          }
        }, 'image/jpeg', 0.9);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      toast({
        title: 'Upload error',
        description: 'Your session expired. Please sign in again.',
        variant: 'destructive',
      });
      navigate('/auth');
      return;
    }

    setUploading(true);

    try {
      // Normalize orientation first
      const normalizedBlob = await normalizeImageOrientation(file);
      
      // Preview the normalized image
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
      };
      reader.readAsDataURL(normalizedBlob);

      // Upload normalized image to storage
      const filePath = `${user.id}/before.jpg`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(filePath, normalizedBlob, { upsert: true, contentType: 'image/jpeg' });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-photos')
        .getPublicUrl(filePath);

      updateProfile({ before_photo_url: publicUrl });
      
      toast({
        title: 'Photo uploaded!',
        description: 'Now generate your transformation.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
      setUploadedImage(null);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
    setTransformationImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const generateTransformation = async (attempt = 0) => {
    if (generating && attempt === 0) return;

    if (attempt === 0) {
      setGenerating(true);
    }
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-clone-transformation', {
        body: {
          currentWeight: profile?.current_weight,
          goalWeight: profile?.goal_weight,
          goalType: profile?.goal_type,
          gender: profile?.gender,
          beforePhotoUrl: uploadedImage || profile?.before_photo_url,
          facePhotoUrl: profile?.face_photo_url,
        },
      });

      if (error) {
        let message = error.message || 'Failed to generate transformation.';
        let isRateLimit = false;
        let suggestedRetryMs = 20000;

        if ('context' in error && error.context) {
          try {
            const errorBody = await error.context.json();
            message = errorBody?.error || message;
            isRateLimit = Boolean(errorBody?.retryable) || message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('resource exhausted') || message.toLowerCase().includes('temporarily busy');
            if (typeof errorBody?.suggestedRetryMs === 'number') {
              suggestedRetryMs = errorBody.suggestedRetryMs;
            }
          } catch {
            if (message.includes('non-2xx') || message.includes('Edge function') || message.includes('429')) {
              isRateLimit = true;
            }
          }
        }

        if (isRateLimit && attempt < 1) {
          toast({
            title: 'Still working on it',
            description: 'The AI is busy, retrying automatically…',
          });
          await new Promise((resolve) => setTimeout(resolve, suggestedRetryMs));
          return await generateTransformation(attempt + 1);
        }

        if (isRateLimit || message.toLowerCase().includes('rate limit') || message.toLowerCase().includes('temporarily busy')) {
          message = 'AI is temporarily busy. We already retried automatically — please wait a moment and try again.';
        }
        if (message.toLowerCase().includes('credits depleted') || message.toLowerCase().includes('payment required')) {
          message = 'AI credits depleted. Please top up in Settings → Workspace → Usage.';
        }

        throw new Error(message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const correctedImage = await ensurePortraitOrientation(data.image);
      setTransformationImage(correctedImage);
      
      updateProfile({ 
        has_seen_transformation: true,
        transformation_photo_url: data.image,
      });
      
      const message = data.faceSwapApplied 
        ? 'Your AI clone is ready with your exact face!'
        : 'Transformation generated!';
      
      toast({
        title: message,
        description: 'This is your potential future self.',
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast({
        title: 'Generation failed',
        description: error.message || 'Failed to generate transformation. Please try again.',
        variant: 'destructive',
      });
    } finally {
      if (attempt === 0 || attempt >= 1) {
        setGenerating(false);
      }
    }
  };

  const handleRegenerate = async () => {
    await generateTransformation();
  };

  const handleStartFromScratch = () => {
    setTransformationImage('');
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    updateProfile({ 
      before_photo_url: null, 
      transformation_photo_url: null,
      has_seen_transformation: false,
    });
    toast({
      title: 'Starting fresh',
      description: 'Upload a new photo to begin again.',
    });
  };

  const handleSubscribe = () => {
    navigate('/pricing');
  };

  const currentImage = uploadedImage || profile?.before_photo_url;
  const displayedTransformation = transformationImage ?? profile?.transformation_photo_url;
  const showGenerateButton = !displayedTransformation && !generating;
  const showRegenerateOption = !!displayedTransformation;

  return (
    <div className="min-h-screen bg-background dark">
      <AppNav />
      <div className="relative p-4 sm:p-6 pb-12">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5 pointer-events-none" />
        
        <div className="relative max-w-4xl mx-auto">
          {/* Back button */}
          <Link 
            to="/onboarding" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to profile
          </Link>

          <div className="text-center mb-6 sm:mb-12">
            <div className="inline-flex items-center gap-2 mb-3">
              <Zap className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <span className="text-xl sm:text-2xl font-display font-bold">FitFuture</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-display font-bold mb-2 sm:mb-4">
              Your AI Transformation
            </h1>
            <p className="text-base sm:text-xl text-muted-foreground">
              See what you could look like at your goal weight
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
            {/* Before Photo */}
            <Card className="glass border-border/50">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center">Current You</h3>
                <div className="aspect-[3/4] bg-muted rounded-xl overflow-hidden relative">
                  {currentImage ? (
                    <>
                      <img 
                        src={currentImage} 
                        alt="Before" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 w-8 h-8 bg-background/80 rounded-full flex items-center justify-center hover:bg-background transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {uploading && (
                        <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        </div>
                      )}
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors">
                      <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                        <Camera className="w-7 h-7 sm:w-8 sm:h-8 text-primary" />
                      </div>
                      <span className="text-foreground font-medium text-sm sm:text-base">Upload your photo</span>
                      <span className="text-xs sm:text-sm text-muted-foreground mt-1">Tap to browse</span>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <div className="mt-3 sm:mt-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Current: {profile?.current_weight || '—'} lbs
                  </p>
                  {currentImage && (
                    <label className="inline-flex items-center gap-2 mt-2 text-xs sm:text-sm text-primary cursor-pointer hover:underline">
                      <Upload className="w-4 h-4" />
                      Change photo
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Transformation Preview */}
            <Card className="glass border-border/50 neon-border">
              <CardContent className="p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-center flex items-center justify-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Future You
                </h3>
                <div className="aspect-[3/4] bg-muted rounded-xl overflow-hidden relative">
                  {displayedTransformation ? (
                    <img 
                      src={displayedTransformation} 
                      alt="Transformation" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      {generating ? (
                        <>
                          <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 text-primary animate-spin mb-3 sm:mb-4" />
                          <span className="text-muted-foreground font-medium text-sm sm:text-base">Generating your future...</span>
                          <span className="text-xs sm:text-sm text-muted-foreground mt-2">This may take a moment</span>
                        </>
                      ) : (
                        <>
                          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 flex items-center justify-center mb-3 sm:mb-4">
                            <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
                          </div>
                          <span className="text-muted-foreground font-medium text-sm sm:text-base">Your transformation awaits</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="mt-3 sm:mt-4 text-center">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Goal: {profile?.goal_weight || '—'} lbs
                  </p>
                  {showRegenerateOption && (
                    <div className="flex flex-col gap-2 mt-3">
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={handleRegenerate}
                        disabled={generating}
                        className="gap-2"
                      >
                        {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        {generating ? 'Regenerating...' : 'Regenerate New Image'}
                      </Button>
                      <Button 
                        variant="destructive"
                        size="sm"
                        onClick={handleStartFromScratch}
                        className="gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Start From Scratch
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 sm:mt-8 text-center space-y-4">
            {showGenerateButton && (
              <Button 
                size="lg" 
                onClick={() => generateTransformation()}
                disabled={generating || uploading || !currentImage}
                className="neon-glow animate-pulse-glow w-full sm:w-auto"
              >
                {generating ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-5 h-5 mr-2" />
                )}
                {currentImage ? 'Generate My Transformation' : 'Upload a photo first'}
              </Button>
            )}

            {displayedTransformation && (
              <Button size="lg" onClick={() => navigate('/dashboard')} className="w-full sm:w-auto">
                Go to Dashboard
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
