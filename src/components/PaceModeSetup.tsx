import { useState } from 'react';
import { Rocket, Target, Calendar, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useProfile } from '@/hooks/useProfile';
import { usePaceMilestones } from '@/hooks/usePaceMilestones';

interface PaceModeSetupProps {
  trigger?: React.ReactNode;
}

export function PaceModeSetup({ trigger }: PaceModeSetupProps) {
  const { profile } = useProfile();
  const { initializePaceMode, isPaceEnabled, isLoading } = usePaceMilestones();
  const [duration, setDuration] = useState('12');
  const [open, setOpen] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const canEnable = profile?.current_weight && profile?.goal_weight && profile?.before_photo_url;

  const handleEnable = async () => {
    setIsInitializing(true);
    const success = await initializePaceMode(parseInt(duration));
    setIsInitializing(false);
    if (success) {
      setOpen(false);
    }
  };

  if (isPaceEnabled) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90">
            <Rocket className="w-4 h-4" />
            Enable PACE Mode
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Rocket className="w-6 h-6 text-primary" />
            Enable PACE Mode
          </DialogTitle>
          <DialogDescription>
            Track your transformation with AI-generated weekly milestones. See what you should look like at each checkpoint if you follow your program.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Prerequisites Check */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Prerequisites</h4>
            <div className="space-y-2">
              <div className={`flex items-center gap-2 text-sm ${profile?.current_weight ? 'text-green-500' : 'text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${profile?.current_weight ? 'bg-green-500' : 'bg-muted'}`} />
                Current weight: {profile?.current_weight ? `${profile.current_weight} lbs` : 'Not set'}
              </div>
              <div className={`flex items-center gap-2 text-sm ${profile?.goal_weight ? 'text-green-500' : 'text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${profile?.goal_weight ? 'bg-green-500' : 'bg-muted'}`} />
                Goal weight: {profile?.goal_weight ? `${profile.goal_weight} lbs` : 'Not set'}
              </div>
              <div className={`flex items-center gap-2 text-sm ${profile?.before_photo_url ? 'text-green-500' : 'text-muted-foreground'}`}>
                <div className={`w-2 h-2 rounded-full ${profile?.before_photo_url ? 'bg-green-500' : 'bg-muted'}`} />
                Before photo: {profile?.before_photo_url ? 'Uploaded' : 'Not uploaded'}
              </div>
            </div>
          </div>

          {!canEnable && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg text-sm text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Please complete all prerequisites before enabling PACE mode.</span>
            </div>
          )}

          {/* Program Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              Program Duration
            </label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger>
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="8">8 weeks</SelectItem>
                <SelectItem value="12">12 weeks (recommended)</SelectItem>
                <SelectItem value="16">16 weeks</SelectItem>
                <SelectItem value="24">24 weeks</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              AI milestones will be generated every 2 weeks
            </p>
          </div>

          {/* What You'll Get */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">What you'll get</h4>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                AI-generated milestone images for each checkpoint
              </li>
              <li className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Side-by-side comparisons with your actual progress
              </li>
              <li className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Visual motivation to stay on track
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleEnable} 
            disabled={!canEnable || isInitializing || isLoading}
            className="gap-2"
          >
            {isInitializing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Initializing...
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Start PACE Mode
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
