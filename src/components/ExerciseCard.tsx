import { useState, useEffect } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Target, Lightbulb, Play, RefreshCw, ImageOff } from "lucide-react";
import { GeneratedExercise } from "@/hooks/useWorkoutLogs";
import { supabase } from "@/integrations/supabase/client";

interface ExerciseCardProps {
  exercise: GeneratedExercise;
  index: number;
  onSwap?: (index: number) => void;
  isSwapping?: boolean;
}

export function ExerciseCard({ exercise, index, onSwap, isSwapping }: ExerciseCardProps) {
  const [demoUrl, setDemoUrl] = useState<string | null>(exercise.videoUrl || null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
    if (exercise.videoUrl) {
      setDemoUrl(exercise.videoUrl);
    } else {
      fetchExerciseVideo();
    }
  }, [exercise.name, exercise.videoUrl]);

  const fetchExerciseVideo = async () => {
    try {
      const { data, error } = await supabase
        .from("exercises")
        .select("external_video_url")
        .ilike("name", exercise.name)
        .limit(1)
        .maybeSingle();

      if (!error && data?.external_video_url) {
        setDemoUrl(data.external_video_url);
      }
    } catch (err) {
      console.error("Error fetching exercise video:", err);
    }
  };

  return (
    <Accordion type="single" collapsible className="w-full">
      <AccordionItem value={`exercise-${index}`} className="border rounded-lg bg-muted/30 px-4">
        <AccordionTrigger className="hover:no-underline py-3">
          <div className="flex items-center justify-between w-full pr-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-semibold">
                {index + 1}
              </span>
              <span className="font-medium text-left">{exercise.name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{exercise.sets} × {exercise.reps}</span>
              <span className="text-xs">| {exercise.rest}</span>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pb-4">
          <div className="space-y-4 pt-2">
            {onSwap && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onSwap(index); }}
                disabled={isSwapping}
                className="w-full gap-2"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSwapping ? 'animate-spin' : ''}`} />
                {isSwapping ? 'Swapping...' : 'Swap Exercise'}
              </Button>
            )}

            {/* Exercise Demo GIF */}
            {demoUrl && !imgError && (
              <div className="rounded-lg overflow-hidden bg-muted/50 border border-border w-40 mx-auto">
                <img
                  src={demoUrl}
                  alt={`${exercise.name} demonstration`}
                  className="w-full h-auto object-contain"
                  loading="lazy"
                  onError={() => setImgError(true)}
                />
              </div>
            )}

            {/* Show placeholder when demo failed to load */}
            {imgError && (
              <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-muted/30 border border-border/50 text-xs text-muted-foreground">
                <ImageOff className="h-3.5 w-3.5 flex-shrink-0" />
                <span>Demo temporarily unavailable</span>
              </div>
            )}

            {exercise.description && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Play className="w-4 h-4 text-primary" />
                  <span>How to perform</span>
                </div>
                <p className="text-sm text-muted-foreground pl-6">{exercise.description}</p>
              </div>
            )}

            {exercise.targetMuscles && exercise.targetMuscles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Target className="w-4 h-4 text-primary" />
                  <span>Target muscles</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pl-6">
                  {exercise.targetMuscles.map((muscle, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{muscle}</Badge>
                  ))}
                </div>
              </div>
            )}

            {exercise.tips && exercise.tips.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <span>Pro tips</span>
                </div>
                <ul className="list-disc pl-10 space-y-1">
                  {exercise.tips.map((tip, i) => (
                    <li key={i} className="text-sm text-muted-foreground">{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
