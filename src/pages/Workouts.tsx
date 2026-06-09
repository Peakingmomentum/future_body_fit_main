import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useUserRole } from '@/hooks/useUserRole';
import { WorkoutHub } from '@/components/WorkoutHub';
import { AdminExerciseManager } from '@/components/AdminExerciseManager';
import { AppNav } from '@/components/AppNav';
import { Loader2 } from 'lucide-react';

export default function Workouts() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin } = useUserRole();
  const {
    logs,
    todayLogs,
    activeWorkout,
    isLoading,
    createTodayLog,
    completeWorkout,
    updateExercise,
    todayCompletedCount,
    completedCount,
  } = useWorkoutLogs();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      <AppNav />
      <div className="relative p-4 sm:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto space-y-6">
          <WorkoutHub
            logs={logs}
            todayLogs={todayLogs}
            activeWorkout={activeWorkout}
            isLoading={isLoading}
            createTodayLog={createTodayLog}
            completeWorkout={completeWorkout}
            updateExercise={updateExercise}
            todayCompletedCount={todayCompletedCount}
            completedCount={completedCount}
          />

          
        </div>
      </div>
    </div>
  );
}
