import { useState } from 'react';
import { Sparkles, Lock, Check, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePaceMilestones, PaceMilestone } from '@/hooks/usePaceMilestones';
import { cn } from '@/lib/utils';

export function PaceTimeline() {
  const { 
    milestones, 
    currentWeek, 
    isGenerating, 
    generateMilestoneImage,
    programDurationWeeks 
  } = usePaceMilestones();
  
  const [selectedMilestone, setSelectedMilestone] = useState<PaceMilestone | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  if (milestones.length === 0) {
    return null;
  }

  const handleGenerate = async (milestone: PaceMilestone) => {
    await generateMilestoneImage(milestone.id);
  };

  const scrollTimeline = (direction: 'left' | 'right') => {
    const container = document.getElementById('pace-timeline-scroll');
    if (container) {
      const scrollAmount = 200;
      const newPosition = direction === 'left' 
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;
      container.scrollTo({ left: newPosition, behavior: 'smooth' });
      setScrollPosition(newPosition);
    }
  };

  const getMilestoneStatus = (milestone: PaceMilestone) => {
    if (milestone.status === 'generated') return 'generated';
    if (milestone.week_number <= currentWeek) return 'available';
    return 'locked';
  };

  return (
    <Card className="bg-card/50 backdrop-blur border-border/50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              PACE Timeline
            </h3>
            <p className="text-sm text-muted-foreground">
              Week {currentWeek} of {programDurationWeeks}
            </p>
          </div>
          <div className="flex gap-1">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => scrollTimeline('left')}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => scrollTimeline('right')}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Timeline Track */}
        <div className="relative">
          {/* Progress Bar */}
          <div className="absolute top-8 left-0 right-0 h-1 bg-muted rounded-full">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500"
              style={{ width: `${(currentWeek / programDurationWeeks) * 100}%` }}
            />
          </div>

          {/* Milestones */}
          <div 
            id="pace-timeline-scroll"
            className="flex gap-4 overflow-x-auto pb-4 pt-2 scrollbar-hide"
            style={{ scrollBehavior: 'smooth' }}
          >
            {/* Start Point */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center mb-2">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <span className="text-xs font-medium">Start</span>
              <span className="text-xs text-muted-foreground">Week 0</span>
            </div>

            {milestones.map((milestone) => {
              const status = getMilestoneStatus(milestone);
              const isSelected = selectedMilestone?.id === milestone.id;
              
              return (
                <div 
                  key={milestone.id} 
                  className="flex flex-col items-center shrink-0 cursor-pointer"
                  onClick={() => setSelectedMilestone(isSelected ? null : milestone)}
                >
                  <div className={cn(
                    "w-16 h-16 rounded-full border-2 flex items-center justify-center mb-2 transition-all",
                    status === 'generated' && "bg-green-500/20 border-green-500",
                    status === 'available' && "bg-primary/20 border-primary hover:scale-105",
                    status === 'locked' && "bg-muted/50 border-muted-foreground/30",
                    isSelected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}>
                    {status === 'generated' ? (
                      milestone.ai_image_url ? (
                        <img 
                          src={milestone.ai_image_url} 
                          alt={`Week ${milestone.week_number}`}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <Check className="w-6 h-6 text-green-500" />
                      )
                    ) : status === 'available' ? (
                      <Play className="w-6 h-6 text-primary" />
                    ) : (
                      <Lock className="w-5 h-5 text-muted-foreground/50" />
                    )}
                  </div>
                  <span className="text-xs font-medium">
                    {milestone.target_weight?.toFixed(0)} lbs
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Week {milestone.week_number}
                  </span>
                </div>
              );
            })}

            {/* Goal Point */}
            <div className="flex flex-col items-center shrink-0">
              <div className="w-16 h-16 rounded-full bg-accent/20 border-2 border-accent flex items-center justify-center mb-2">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
              <span className="text-xs font-medium">Goal</span>
              <span className="text-xs text-muted-foreground">Week {programDurationWeeks}</span>
            </div>
          </div>
        </div>

        {/* Selected Milestone Detail */}
        {selectedMilestone && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium">Week {selectedMilestone.week_number} Milestone</h4>
                <p className="text-sm text-muted-foreground">
                  Target: {selectedMilestone.target_weight?.toFixed(1)} lbs
                </p>
              </div>
              {getMilestoneStatus(selectedMilestone) === 'available' && (
                <Button 
                  size="sm"
                  onClick={() => handleGenerate(selectedMilestone)}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Preview
                    </>
                  )}
                </Button>
              )}
              {getMilestoneStatus(selectedMilestone) === 'generated' && selectedMilestone.ai_image_url && (
                <div className="w-20 h-20 rounded-lg overflow-hidden">
                  <img 
                    src={selectedMilestone.ai_image_url} 
                    alt={`Week ${selectedMilestone.week_number} preview`}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              {getMilestoneStatus(selectedMilestone) === 'locked' && (
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Lock className="w-4 h-4" />
                  Unlocks in week {selectedMilestone.week_number}
                </span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
