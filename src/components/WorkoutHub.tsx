import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dumbbell, Loader2, CheckCircle2, Sparkles, Plus, RefreshCw, Calendar, Clock } from 'lucide-react';
import { GeneratedWorkout, GeneratedExercise, WorkoutLog } from '@/hooks/useWorkoutLogs';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format, startOfWeek, isBefore } from 'date-fns';
import { ExerciseCard } from '@/components/ExerciseCard';

const FOCUS_AREAS = [
  { value: 'full_body', label: 'Full Body' },
  { value: 'upper_body', label: 'Upper Body' },
  { value: 'lower_body', label: 'Lower Body' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'speed_agility', label: 'Speed & Agility' },
  { value: 'conditioning', label: 'Conditioning' },
  { value: 'mobility', label: 'Mobility & Recovery' },
];

const EQUIPMENT_OPTIONS = [
  { value: 'no_equipment', label: 'No Equipment (Bodyweight)' },
  { value: 'minimal', label: 'Minimal (Dumbbells/Bands)' },
  { value: 'home_gym', label: 'Home Gym (Bench, Weights)' },
  { value: 'full_gym', label: 'Full Gym Access' },
];

interface WorkoutHubProps {
  logs: WorkoutLog[];
  todayLogs: WorkoutLog[];
  activeWorkout: WorkoutLog | null;
  isLoading: boolean;
  createTodayLog: (workout: GeneratedWorkout) => Promise<WorkoutLog | null>;
  completeWorkout: () => Promise<void>;
  updateExercise: (logId: string, exerciseIndex: number, newExercise: GeneratedExercise) => Promise<void>;
  todayCompletedCount: number;
  completedCount: number;
}

/** Queue background video generation for exercises without cached videos */
const queueBackgroundVideoGeneration = async (exercises: GeneratedExercise[]) => {
  for (const exercise of exercises) {
    try {
      // Check if video already exists
      const { data } = await supabase
        .from("exercises")
        .select("external_video_url, video_status")
        .ilike("name", exercise.name)
        .maybeSingle();

      // Skip if already completed or generating
      if (data?.video_status === "completed" || data?.video_status === "generating") continue;

      // Fire-and-forget: trigger generation in background
      supabase.functions.invoke("generate-exercise-video", {
        body: {
          exerciseName: exercise.name,
          description: exercise.description || "",
          targetMuscles: exercise.targetMuscles || [],
          equipment: "bodyweight",
        },
      }).catch(err => console.error(`Background video gen failed for ${exercise.name}:`, err));

      // Small delay between queuing to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    } catch {
      // Ignore errors in background queue
    }
  }
};

export function WorkoutHub({ 
  logs,
  todayLogs, 
  activeWorkout, 
  isLoading, 
  createTodayLog, 
  completeWorkout,
  updateExercise,
  todayCompletedCount,
  completedCount
}: WorkoutHubProps) {
  const { profile } = useProfile();
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [focusArea, setFocusArea] = useState('full_body');
  const [equipment, setEquipment] = useState('no_equipment');
  const [swappingIndex, setSwappingIndex] = useState<number | null>(null);

  const handleGenerateWorkout = async () => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-workout', {
        body: {
          goalType: profile?.goal_type || 'general_fitness',
          fitnessLevel: profile?.fitness_level || 'intermediate',
          gender: profile?.gender || 'unspecified',
          focusArea,
          equipment,
        },
      });

      if (error) throw error;
      
      if (data?.workout) {
        await createTodayLog(data.workout);
        // Background video generation disabled — was consuming excessive Replicate credits
        // queueBackgroundVideoGeneration(data.workout.exercises);
      } else {
        throw new Error('No workout generated');
      }
    } catch (error: any) {
      console.error('Error generating workout:', error);
      toast({
        title: 'Failed to generate workout',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSwapExercise = async (exerciseIndex: number) => {
    if (!activeWorkout?.workout_plan) return;
    const workout = activeWorkout.workout_plan as GeneratedWorkout;
    const exercise = workout.exercises[exerciseIndex];
    
    setSwappingIndex(exerciseIndex);
    try {
      const { data, error } = await supabase.functions.invoke('swap-exercise', {
        body: {
          exerciseName: exercise.name,
          focusArea,
          equipment,
          currentExercises: workout.exercises.map(e => e.name),
        },
      });

      if (error) throw error;
      
      if (data?.exercise) {
        await updateExercise(activeWorkout.id, exerciseIndex, data.exercise);
        toast({ title: `Swapped: ${exercise.name} → ${data.exercise.name}` });
      }
    } catch (error: any) {
      toast({ title: 'Failed to swap exercise', description: error.message, variant: 'destructive' });
    } finally {
      setSwappingIndex(null);
    }
  };

  // Group completed logs by week
  const groupedByWeek = logs.filter(log => log.completed).reduce((acc, log) => {
    const date = new Date(log.workout_date);
    const weekStart = startOfWeek(date, { weekStartsOn: 1 });
    const weekKey = format(weekStart, 'yyyy-MM-dd');
    
    if (!acc[weekKey]) {
      acc[weekKey] = { weekStart, label: format(weekStart, "'Week of' MMM d, yyyy"), logs: [] };
    }
    acc[weekKey].logs.push(log);
    return acc;
  }, {} as Record<string, { weekStart: Date; label: string; logs: WorkoutLog[] }>);

  const sortedWeeks = Object.values(groupedByWeek).sort((a, b) => 
    isBefore(a.weekStart, b.weekStart) ? 1 : -1
  );

  const completedToday = todayLogs.filter(log => log.completed);
  const workout = activeWorkout?.workout_plan as GeneratedWorkout | null;

  return (
    <Card className="glass border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Dumbbell className="w-5 h-5 text-primary" />
          Workout Hub
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="today" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Today
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <Calendar className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : activeWorkout && workout && workout.exercises && Array.isArray(workout.exercises) ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{workout.name || "Today's Workout"}</h3>
                    <p className="text-sm text-muted-foreground">
                      {workout.duration || ''} {workout.calories ? `• ~${workout.calories} cal` : ''}
                    </p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleGenerateWorkout} 
                    disabled={isGenerating}
                    title="Regenerate workout"
                  >
                    <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {workout.exercises.map((exercise, index) => (
                    <ExerciseCard 
                      key={`${exercise.name}-${index}`} 
                      exercise={exercise} 
                      index={index}
                      onSwap={handleSwapExercise}
                      isSwapping={swappingIndex === index}
                    />
                  ))}
                </div>

                {todayCompletedCount > 0 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{todayCompletedCount} workout{todayCompletedCount > 1 ? 's' : ''} already completed today
                  </p>
                )}

                <Button onClick={completeWorkout} className="w-full gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Complete Workout
                </Button>
              </>
            ) : completedToday.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-500">
                  <CheckCircle2 className="h-5 w-5" />
                  <span className="font-medium">
                    {todayCompletedCount} workout{todayCompletedCount > 1 ? 's' : ''} completed today
                  </span>
                </div>
                
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {completedToday.map((log) => {
                    const w = log.workout_plan as GeneratedWorkout | null;
                    return (
                      <div key={log.id} className="p-2 rounded-lg bg-muted/50 flex items-center justify-between text-sm">
                        <span className="text-foreground">{w?.name || 'Workout'}</span>
                        <span className="text-muted-foreground">{w?.duration || ''}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Select value={focusArea} onValueChange={setFocusArea}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Focus Area" /></SelectTrigger>
                    <SelectContent>
                      {FOCUS_AREAS.map((area) => (
                        <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={equipment} onValueChange={setEquipment}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Equipment" /></SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button onClick={handleGenerateWorkout} disabled={isGenerating} variant="outline" className="w-full gap-2">
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
                  ) : (
                    <><Plus className="h-4 w-4" />Add Another Workout</>
                  )}
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 space-y-4">
                <div className="p-4 rounded-full bg-primary/10">
                  <Dumbbell className="h-8 w-8 text-primary" />
                </div>
                <p className="text-muted-foreground text-center">Ready for today's workout?</p>
                
                <div className="flex gap-2 w-full max-w-sm">
                  <Select value={focusArea} onValueChange={setFocusArea}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Focus" /></SelectTrigger>
                    <SelectContent>
                      {FOCUS_AREAS.map((area) => (
                        <SelectItem key={area.value} value={area.value}>{area.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={equipment} onValueChange={setEquipment}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Equipment" /></SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button onClick={handleGenerateWorkout} disabled={isGenerating} className="gap-2">
                  {isGenerating ? (
                    <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" />Generate Today's Workout</>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {sortedWeeks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No completed workouts yet. Start your first one!
              </p>
            ) : (
              <>
                <div className="space-y-4 max-h-80 overflow-y-auto">
                  {sortedWeeks.map((week) => (
                    <div key={week.label} className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{week.label}</h4>
                      {week.logs.map((log) => {
                        const w = log.workout_plan as GeneratedWorkout | null;
                        const date = new Date(log.workout_date);
                        return (
                          <div key={log.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{w?.name || 'Workout'}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <span>{format(date, 'EEE, MMM d')}</span>
                                {w?.duration && (<><span>•</span><Clock className="h-3 w-3" /><span>{w.duration}</span></>)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    <span className="font-semibold text-foreground">{completedCount}</span> total workouts completed
                  </p>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
