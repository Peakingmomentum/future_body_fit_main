import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Zap, ArrowRight, ArrowLeft, Loader2, Scale, Ruler, User, Target, Upload, Camera, X } from 'lucide-react';

const steps = [
  { id: 'basics', title: 'Basic Info', description: 'Tell us about yourself' },
  { id: 'goals', title: 'Your Goals', description: 'What do you want to achieve?' },
  { id: 'photo', title: 'Body Photo', description: 'Upload your full body photo' },
  { id: 'face', title: 'Face Photo', description: 'Upload a clear headshot' },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    currentWeight: '',
    goalWeight: '',
    height: '',
    age: '',
    gender: '',
    fitnessLevel: 'beginner',
    goalType: 'general',
  });
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFaceImage, setUploadedFaceImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const faceInputRef = useRef<HTMLInputElement>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { updateProfile, isUpdating } = useProfile();
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

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'body' | 'face') => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      toast({
        title: 'Upload error',
        description: 'Your session expired. Please sign in again.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    // Preview immediately
    const reader = new FileReader();
    reader.onload = (event) => {
      if (type === 'body') {
        setUploadedImage(event.target?.result as string);
      } else {
        setUploadedFaceImage(event.target?.result as string);
      }
    };
    reader.readAsDataURL(file);

    // Upload to storage
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = type === 'body' 
        ? `${user.id}/before.${fileExt}`
        : `${user.id}/face.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('user-photos')
        .getPublicUrl(filePath);

      if (type === 'body') {
        updateProfile({ before_photo_url: publicUrl });
      } else {
        updateProfile({ face_photo_url: publicUrl });
      }
      
      toast({
        title: 'Photo uploaded!',
        description: type === 'body' ? 'Body photo saved.' : 'Face photo saved for your AI clone.',
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload photo. Please try again.',
        variant: 'destructive',
      });
      if (type === 'body') {
        setUploadedImage(null);
      } else {
        setUploadedFaceImage(null);
      }
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (type: 'body' | 'face') => {
    if (type === 'body') {
      setUploadedImage(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      setUploadedFaceImage(null);
      if (faceInputRef.current) {
        faceInputRef.current.value = '';
      }
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Final step - save profile and navigate
      try {
        updateProfile({
          current_weight: parseFloat(formData.currentWeight) || null,
          goal_weight: parseFloat(formData.goalWeight) || null,
          height: parseFloat(formData.height) || null,
          age: parseInt(formData.age) || null,
          gender: formData.gender || null,
          fitness_level: formData.fitnessLevel,
          goal_type: formData.goalType,
        });
        
        toast({
          title: 'Profile saved!',
          description: 'Ready to see your transformation?',
        });
        
        navigate('/transformation');
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to save profile',
          variant: 'destructive',
        });
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.currentWeight && formData.height && formData.age && formData.gender;
      case 1:
        return formData.goalWeight && formData.fitnessLevel && formData.goalType;
      case 2:
        return true; // Body photo is optional
      case 3:
        return true; // Face photo is optional
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-background dark flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
      
      <div className="relative w-full max-w-lg">
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`
                w-10 h-10 rounded-full flex items-center justify-center font-semibold
                ${index <= currentStep 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted text-muted-foreground'}
              `}>
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-16 h-1 mx-2 rounded ${
                  index < currentStep ? 'bg-primary' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>

        <Card className="glass border-border/50">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Zap className="w-6 h-6 text-primary" />
              <span className="text-lg font-display font-bold">FitFuture</span>
            </div>
            <CardTitle className="text-2xl">{steps[currentStep].title}</CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          
          <CardContent>
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentWeight">Current Weight (lbs)</Label>
                    <div className="relative">
                      <Scale className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="currentWeight"
                        type="number"
                        placeholder="180"
                        value={formData.currentWeight}
                        onChange={(e) => handleInputChange('currentWeight', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="height">Height (inches)</Label>
                    <div className="relative">
                      <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="height"
                        type="number"
                        placeholder="70"
                        value={formData.height}
                        onChange={(e) => handleInputChange('height', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="age">Age</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="age"
                        type="number"
                        placeholder="30"
                        value={formData.age}
                        onChange={(e) => handleInputChange('age', e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select 
                      value={formData.gender} 
                      onValueChange={(value) => handleInputChange('gender', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="goalWeight">Goal Weight (lbs)</Label>
                  <div className="relative">
                    <Target className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="goalWeight"
                      type="number"
                      placeholder="165"
                      value={formData.goalWeight}
                      onChange={(e) => handleInputChange('goalWeight', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label>Fitness Level</Label>
                  <Select 
                    value={formData.fitnessLevel} 
                    onValueChange={(value) => handleInputChange('fitnessLevel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beginner">Beginner (New to fitness)</SelectItem>
                      <SelectItem value="intermediate">Intermediate (Some experience)</SelectItem>
                      <SelectItem value="advanced">Advanced (Regular gym-goer)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Primary Goal</Label>
                  <Select 
                    value={formData.goalType} 
                    onValueChange={(value) => handleInputChange('goalType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weight_loss">Lose Weight</SelectItem>
                      <SelectItem value="muscle_gain">Build Muscle</SelectItem>
                      <SelectItem value="toning">Tone & Define</SelectItem>
                      <SelectItem value="general">General Fitness</SelectItem>
                      <SelectItem value="strength">Build Strength</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="aspect-square max-w-[280px] mx-auto bg-muted rounded-xl overflow-hidden relative">
                  {uploadedImage ? (
                    <>
                      <img 
                        src={uploadedImage} 
                        alt="Body photo" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage('body')}
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
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <Camera className="w-8 h-8 text-primary" />
                      </div>
                      <span className="text-foreground font-medium">Upload full body photo</span>
                      <span className="text-sm text-muted-foreground mt-1">Click or tap to browse</span>
                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, 'body')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {uploadedImage 
                    ? 'Great! Now add a face photo for your personalized AI clone.' 
                    : 'Optional: Upload a full body photo for your transformation.'}
                </p>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="aspect-square max-w-[280px] mx-auto bg-muted rounded-xl overflow-hidden relative">
                  {uploadedFaceImage ? (
                    <>
                      <img 
                        src={uploadedFaceImage} 
                        alt="Face photo" 
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={() => removeImage('face')}
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
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                        <User className="w-8 h-8 text-primary" />
                      </div>
                      <span className="text-foreground font-medium">Upload a clear headshot</span>
                      <span className="text-sm text-muted-foreground mt-1">Front-facing, good lighting</span>
                      <input 
                        ref={faceInputRef}
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleImageUpload(e, 'face')}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  {uploadedFaceImage 
                    ? 'Perfect! Your AI clone will have your exact face.' 
                    : 'This ensures your transformation looks exactly like you.'}
                </p>
              </div>
            )}

            <div className="flex gap-4 mt-8">
              {currentStep > 0 && (
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <Button 
                onClick={handleNext} 
                disabled={!canProceed() || isUpdating || uploading}
                className="flex-1"
              >
                {isUpdating || uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : currentStep === steps.length - 1 ? (
                  'See My Transformation'
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
