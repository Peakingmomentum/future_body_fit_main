import { useState } from 'react';
import { Sparkles, Camera, TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePaceMilestones } from '@/hooks/usePaceMilestones';
import { useProfile } from '@/hooks/useProfile';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { cn } from '@/lib/utils';

interface WeeklyPaceCardProps {
  onViewTimeline?: () => void;
  onUploadPhoto?: () => void;
}

export function WeeklyPaceCard({ onViewTimeline, onUploadPhoto }: WeeklyPaceCardProps) {
  const { 
    currentMilestone, 
    currentWeek, 
    isPaceEnabled,
    isGenerating,
    generateMilestoneImage,
    getPaceStatus 
  } = usePaceMilestones();
  const { profile } = useProfile();
  const { latestPhoto } = useProgressPhotos();
  const [isGeneratingLocal, setIsGeneratingLocal] = useState(false);

  if (!isPaceEnabled || !currentMilestone) {
    return null;
  }

  const paceStatus = getPaceStatus(profile?.current_weight ? Number(profile.current_weight) : null);

  const handleGenerate = async () => {
    if (!currentMilestone) return;
    setIsGeneratingLocal(true);
    await generateMilestoneImage(currentMilestone.id);
    setIsGeneratingLocal(false);
  };

  const StatusIcon = paceStatus.status === 'ahead' ? TrendingUp 
    : paceStatus.status === 'behind' ? TrendingDown 
    : Minus;

  const statusColors = {
    'on-pace': 'text-green-500 bg-green-500/10',
    'ahead': 'text-blue-500 bg-blue-500/10',
    'behind': 'text-amber-500 bg-amber-500/10',
    'unknown': 'text-muted-foreground bg-muted/50'
  };

  return (
    <Card className="bg-gradient-to-br from-card to-card/80 border-border/50 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            PACE Mode - Week {currentWeek}
          </span>
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1",
            statusColors[paceStatus.status]
          )}>
            <StatusIcon className="w-3 h-3" />
            {paceStatus.message}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comparison View */}
        <div className="grid grid-cols-2 gap-4">
          {/* AI Target */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground text-center">AI Target</div>
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted/30 relative">
              {currentMilestone.ai_image_url ? (
                <img 
                  src={currentMilestone.ai_image_url} 
                  alt="AI predicted transformation"
                  className="w-full h-full object-cover"
                />
              ) : currentMilestone.status === 'pending' ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Generate your week {currentMilestone.week_number} prediction</p>
                  <Button 
                    size="sm" 
                    className="mt-3 gap-1"
                    onClick={handleGenerate}
                    disabled={isGenerating || isGeneratingLocal}
                  >
                    {isGenerating || isGeneratingLocal ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        Generate
                      </>
                    )}
                  </Button>
                </div>
              ) : null}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                <div className="text-white text-sm font-medium">
                  {currentMilestone.target_weight?.toFixed(0)} lbs
                </div>
                <div className="text-white/70 text-xs">Week {currentMilestone.week_number} Goal</div>
              </div>
            </div>
          </div>

          {/* Actual Progress */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground text-center">Your Progress</div>
            <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted/30 relative">
              {latestPhoto?.photo_url ? (
                <img 
                  src={latestPhoto.photo_url} 
                  alt="Your latest progress"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                  <Camera className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-xs text-muted-foreground">Upload your latest progress photo</p>
                  {onUploadPhoto && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="mt-3 gap-1"
                      onClick={onUploadPhoto}
                    >
                      <Camera className="w-3 h-3" />
                      Upload
                    </Button>
                  )}
                </div>
              )}
              {latestPhoto && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <div className="text-white text-sm font-medium">
                    {profile?.current_weight ? `${Number(profile.current_weight).toFixed(0)} lbs` : 'No weight'}
                  </div>
                  <div className="text-white/70 text-xs">Current</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Weight Comparison Bar */}
        {profile?.current_weight && currentMilestone.target_weight && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progress to milestone</span>
              <span className={cn(
                "font-medium",
                paceStatus.status === 'on-pace' && "text-green-500",
                paceStatus.status === 'ahead' && "text-blue-500",
                paceStatus.status === 'behind' && "text-amber-500"
              )}>
                {paceStatus.status === 'behind' 
                  ? `${paceStatus.difference.toFixed(1)} lbs to go`
                  : paceStatus.status === 'ahead'
                  ? `${paceStatus.difference.toFixed(1)} lbs ahead!`
                  : 'On track!'}
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  paceStatus.status === 'on-pace' && "bg-green-500",
                  paceStatus.status === 'ahead' && "bg-blue-500",
                  paceStatus.status === 'behind' && "bg-amber-500",
                  paceStatus.status === 'unknown' && "bg-muted-foreground"
                )}
                style={{ 
                  width: paceStatus.status === 'behind' 
                    ? `${Math.max(10, 100 - (paceStatus.difference / 10) * 100)}%`
                    : '100%'
                }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        {onViewTimeline && (
          <Button 
            variant="ghost" 
            className="w-full justify-between text-muted-foreground hover:text-white"
            onClick={onViewTimeline}
          >
            View full timeline
            <ChevronRight className="w-4 h-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
