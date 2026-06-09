import { useState } from 'react';
import { Sparkles, Camera, ArrowDown, Play, Lock, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePaceMilestones, PaceMilestone } from '@/hooks/usePaceMilestones';
import { useProfile } from '@/hooks/useProfile';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { cn } from '@/lib/utils';

interface TransformationTimelineProps {
  onUploadPhoto?: () => void;
}

export function TransformationTimeline({ onUploadPhoto }: TransformationTimelineProps) {
  const { profile } = useProfile();
  const { latestPhoto } = useProgressPhotos();
  const { 
    milestones, 
    isPaceEnabled, 
    currentWeek, 
    programDurationWeeks,
    isGenerating,
    generateMilestoneImage 
  } = usePaceMilestones();
  
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const handleGenerate = async (milestone: PaceMilestone) => {
    setGeneratingId(milestone.id);
    await generateMilestoneImage(milestone.id);
    setGeneratingId(null);
  };

  // Get the single most relevant AI milestone to display
  const getRelevantMilestone = () => {
    if (!isPaceEnabled || milestones.length === 0) return null;
    
    const sorted = [...milestones].sort((a, b) => a.week_number - b.week_number);
    
    // First, try to find a generated milestone (prioritize most recent)
    const generatedMilestones = sorted.filter(m => m.status === 'generated');
    if (generatedMilestones.length > 0) {
      return { milestone: generatedMilestones[generatedMilestones.length - 1], canGenerate: false, isLocked: false };
    }
    
    // Next, find the first pending milestone - always allow generation for testing
    const firstPending = sorted.find(m => m.status === 'pending');
    if (firstPending) return { milestone: firstPending, canGenerate: true, isLocked: false };
    
    return null;
  };

  const relevantData = getRelevantMilestone();
  const relevantMilestone = relevantData?.milestone || null;
  const milestoneStatus = relevantData?.canGenerate ? 'available' : 
    relevantData?.isLocked ? 'locked' : 'generated';

  return (
    <div className="flex flex-col items-center gap-4 pb-4">
      {/* Starting Point */}
      <div className="w-full max-w-[200px]">
        <div className="aspect-[3/4] bg-muted rounded-xl overflow-hidden mb-2 relative group border-2 border-green-500/50">
          {profile?.original_photo_url ? (
            <img 
              src={profile.original_photo_url} 
              alt="Starting point" 
              className="w-full h-full object-cover"
            />
          ) : profile?.before_photo_url ? (
            <img 
              src={profile.before_photo_url} 
              alt="Starting point" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-xs">No photo</span>
            </div>
          )}
          <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            START
          </div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-xs">Day 1</p>
          <p className="text-[10px] text-muted-foreground">
            {profile?.current_weight ? `${profile.current_weight} lbs` : 'Starting'}
          </p>
        </div>
      </div>

      {/* Arrow */}
      <div className="flex items-center">
        <ArrowDown className="w-4 h-4 text-muted-foreground/50" />
      </div>

      {/* Current You */}
      <div className="w-full max-w-[200px]">
        <div className="aspect-[3/4] bg-muted rounded-xl overflow-hidden mb-2 relative group border-2 border-blue-500/50">
          {latestPhoto ? (
            <img 
              src={latestPhoto.photo_url} 
              alt="Current you" 
              className="w-full h-full object-cover"
            />
          ) : profile?.before_photo_url ? (
            <img 
              src={profile.before_photo_url} 
              alt="Current you" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-xs">Upload photo</span>
              {onUploadPhoto && (
                <Button size="sm" variant="ghost" className="mt-2 h-7 text-xs" onClick={onUploadPhoto}>
                  <Camera className="w-3 h-3 mr-1" />
                  Upload
                </Button>
              )}
            </div>
          )}
          <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
            YOU
          </div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-xs">Current</p>
          <p className="text-[10px] text-muted-foreground">
            {latestPhoto?.weight_at_time 
              ? `${latestPhoto.weight_at_time} lbs` 
              : profile?.current_weight 
              ? `${profile.current_weight} lbs` 
              : 'Today'}
          </p>
        </div>
      </div>

      {/* Arrow before AI Progress */}
      <div className="flex items-center">
        <ArrowDown className="w-4 h-4 text-muted-foreground/50" />
      </div>

      {/* AI Progress - Single most relevant milestone */}
      {relevantMilestone && (
        <div className="w-full max-w-[200px]">
          <div className={cn(
            "aspect-[3/4] rounded-xl overflow-hidden mb-2 relative group transition-all",
            milestoneStatus === 'generated' && "border-2 border-primary/50",
            milestoneStatus === 'available' && "border-2 border-accent/50 ring-2 ring-accent/20",
            milestoneStatus === 'locked' && "border border-muted-foreground/20 opacity-60"
          )}>
            {milestoneStatus === 'generated' && relevantMilestone.ai_image_url ? (
              <>
                <img 
                  src={relevantMilestone.ai_image_url} 
                  alt={`Week ${relevantMilestone.week_number} prediction`}
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 left-2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  AI
                </div>
              </>
            ) : milestoneStatus === 'available' ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-primary/5 to-accent/10 p-3">
                <Sparkles className="w-6 h-6 mb-2 text-primary" />
                <span className="text-[10px] text-center mb-2">Week {relevantMilestone.week_number}</span>
                <Button 
                  size="sm" 
                  className="h-7 text-xs gap-1"
                  onClick={() => handleGenerate(relevantMilestone)}
                  disabled={isGenerating || generatingId === relevantMilestone.id}
                >
                  {generatingId === relevantMilestone.id ? (
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-3 h-3" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground/50 bg-muted/30">
                <Lock className="w-5 h-5 mb-1" />
                <span className="text-[10px]">Week {relevantMilestone.week_number}</span>
              </div>
            )}
          </div>
          <div className="text-center">
            <p className="font-semibold text-xs">Week {relevantMilestone.week_number}</p>
            <p className="text-[10px] text-muted-foreground">
              {relevantMilestone.target_weight?.toFixed(0)} lbs target
            </p>
          </div>
        </div>
      )}

      {/* Arrow before Goal */}
      <div className="flex items-center">
        <ArrowDown className="w-4 h-4 text-muted-foreground/50" />
      </div>

      {/* Goal */}
      <div className="w-full max-w-[200px]">
        <div className="aspect-[3/4] bg-muted rounded-xl overflow-hidden mb-2 relative border-2 border-primary">
          {profile?.transformation_photo_url ? (
            <img 
              src={profile.transformation_photo_url} 
              alt="Goal transformation" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground bg-gradient-to-br from-primary/10 to-accent/20">
              <Sparkles className="w-6 h-6 mb-1 text-primary" />
              <span className="text-xs">AI Goal</span>
            </div>
          )}
          <div className="absolute top-2 left-2 bg-primary text-white text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            GOAL
          </div>
        </div>
        <div className="text-center">
          <p className="font-semibold text-xs text-primary">
            {isPaceEnabled ? `Week ${programDurationWeeks}` : 'Goal'}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {profile?.goal_weight ? `${profile.goal_weight} lbs` : 'Future You'}
          </p>
        </div>
      </div>
    </div>
  );
}
