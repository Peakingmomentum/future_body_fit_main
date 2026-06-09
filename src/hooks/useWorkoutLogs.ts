import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface GeneratedExercise {
  name: string;
  sets: number;
  reps: string;
  rest: string;
  description?: string;
  targetMuscles?: string[];
  tips?: string[];
  videoUrl?: string;
}

export interface GeneratedWorkout {
  name: string;
  duration: string;
  calories: string;
  exercises: GeneratedExercise[];
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_date: string;
  workout_plan: GeneratedWorkout | null;
  completed: boolean;
  duration_minutes: number | null;
  notes: string | null;
  created_at: string;
}

export function useWorkoutLogs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [todayLogs, setTodayLogs] = useState<WorkoutLog[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutLog | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchLogs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('workout_date', { ascending: false });

      if (error) throw error;

      const typedLogs = (data || []).map(log => ({
        ...log,
        workout_plan: log.exercises as unknown as GeneratedWorkout | null
      }));

      setLogs(typedLogs);
      
      // Get all logs for today
      const logsToday = typedLogs.filter(log => log.workout_date === today);
      setTodayLogs(logsToday);
      
      // Find incomplete workout (active) or set to null
      const incompleteWorkout = logsToday.find(log => !log.completed);
      setActiveWorkout(incompleteWorkout || null);
    } catch (error) {
      console.error('Error fetching workout logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [user]);

  const createTodayLog = async (workout: GeneratedWorkout) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('workout_logs')
        .insert({
          user_id: user.id,
          workout_date: today,
          exercises: JSON.parse(JSON.stringify(workout)),
          completed: false,
        })
        .select()
        .single();

      if (error) throw error;

      const newLog: WorkoutLog = { 
        ...data, 
        workout_plan: data.exercises as unknown as GeneratedWorkout 
      };
      setActiveWorkout(newLog);
      setTodayLogs(prev => [newLog, ...prev]);
      setLogs(prev => [newLog, ...prev]);
      toast({ title: 'Workout generated!' });
      return newLog;
    } catch (error: any) {
      toast({ title: 'Error creating workout', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const completeWorkout = async () => {
    if (!user || !activeWorkout) return;

    try {
      const { error } = await supabase
        .from('workout_logs')
        .update({ completed: true })
        .eq('id', activeWorkout.id);

      if (error) throw error;

      setActiveWorkout(null);
      setTodayLogs(prev => prev.map(log => 
        log.id === activeWorkout.id ? { ...log, completed: true } : log
      ));
      setLogs(prev => prev.map(log => 
        log.id === activeWorkout.id ? { ...log, completed: true } : log
      ));
      toast({ title: 'Great job! Workout completed! 💪' });
    } catch (error: any) {
      toast({ title: 'Error completing workout', description: error.message, variant: 'destructive' });
    }
  };

  const startNewWorkout = () => {
    setActiveWorkout(null);
  };

  const updateExercise = async (logId: string, exerciseIndex: number, newExercise: GeneratedExercise) => {
    if (!user) return;

    // Find the log and update in state
    const targetLog = logs.find(l => l.id === logId);
    if (!targetLog || !targetLog.workout_plan) return;

    const updatedExercises = [...targetLog.workout_plan.exercises];
    updatedExercises[exerciseIndex] = newExercise;
    const updatedPlan = { ...targetLog.workout_plan, exercises: updatedExercises };

    try {
      const { error } = await supabase
        .from('workout_logs')
        .update({ exercises: JSON.parse(JSON.stringify(updatedPlan)) })
        .eq('id', logId);

      if (error) throw error;

      // Update local state
      const updateLog = (log: WorkoutLog) => 
        log.id === logId ? { ...log, workout_plan: updatedPlan } : log;

      setLogs(prev => prev.map(updateLog));
      setTodayLogs(prev => prev.map(updateLog));
      if (activeWorkout?.id === logId) {
        setActiveWorkout({ ...activeWorkout, workout_plan: updatedPlan });
      }
    } catch (error: any) {
      toast({ title: 'Error updating exercise', description: error.message, variant: 'destructive' });
    }
  };

  const completedCount = logs.filter(log => log.completed).length;
  const todayCompletedCount = todayLogs.filter(log => log.completed).length;

  return {
    logs,
    todayLogs,
    activeWorkout,
    isLoading,
    createTodayLog,
    completeWorkout,
    startNewWorkout,
    updateExercise,
    completedCount,
    todayCompletedCount,
    refetch: fetchLogs,
  };
}
