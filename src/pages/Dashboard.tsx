import { useEffect, useRef } from 'react';
import { AppNav } from '@/components/AppNav';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { useProfile } from '@/hooks/useProfile';
import { useWorkoutLogs } from '@/hooks/useWorkoutLogs';
import { useNutritionLogs } from '@/hooks/useNutritionLogs';
import { useProgressPhotos } from '@/hooks/useProgressPhotos';
import { usePaceMilestones } from '@/hooks/usePaceMilestones';
import { WorkoutHub } from '@/components/WorkoutHub';
import { ProgressPhotoUploader } from '@/components/ProgressPhotoUploader';
import { ProgressPhotoGallery } from '@/components/ProgressPhotoGallery';
import { PaceModeSetup } from '@/components/PaceModeSetup';


import { AdminExerciseManager } from '@/components/AdminExerciseManager';
import { PaceStatusBadge } from '@/components/PaceStatusBadge';
import { TransformationTimeline } from '@/components/TransformationTimeline';
import { FitnessBuddyChat } from '@/components/FitnessBuddyChat';
import { ProfileSettingsDialog } from '@/components/ProfileSettingsDialog';
import { WodBanner } from '@/components/WodBanner';
import { 
  Zap, 
  Dumbbell, 
  Apple, 
  TrendingUp, 
  Flame,
  Target,
  LogOut,
  Sparkles
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, signOut, loading: authLoading } = useAuth();
  const { org } = useOrg();
  const appName = org?.branding?.app_name || 'Future Body Fit';
  const phrases = org?.branding?.phrases ?? [];
  const { profile, isLoading: profileLoading } = useProfile();
  const { 
    logs,
    todayLogs, 
    activeWorkout, 
    isLoading: workoutLoading, 
    createTodayLog, 
    completeWorkout,
    updateExercise,
    todayCompletedCount,
    completedCount 
  } = useWorkoutLogs();
  const { todayTotals, meals } = useNutritionLogs();
  const { photos, latestPhoto, isUploading, uploadPhoto, deletePhoto } = useProgressPhotos();
  const { isPaceEnabled } = usePaceMilestones();
  const photoUploaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background dark flex items-center justify-center">
        <Zap className="w-12 h-12 text-primary animate-pulse" />
      </div>
    );
  }

  const stats = [
    { label: 'Current Weight', value: `${profile?.current_weight || '—'} lbs`, icon: TrendingUp },
    { label: 'Goal Weight', value: `${profile?.goal_weight || '—'} lbs`, icon: Target },
    { label: 'Streak', value: '0 days', icon: Flame },
    { label: 'Workouts', value: String(completedCount), icon: Dumbbell },
  ];

  return (
    <div className="min-h-screen bg-background dark">
      <AppNav />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      {/* Header */}
      <header className="relative border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-8 h-8 text-primary" />
            <span className="text-xl font-display font-bold text-white">{appName}</span>
          </div>
          <div className="flex items-center gap-4">
            <PaceStatusBadge size="sm" />
            <span className="text-sm text-muted-foreground">
              {profile?.full_name || user?.email}
            </span>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="relative max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6">
          <WodBanner />
        </div>
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold mb-2 text-white">
            Welcome back, {profile?.full_name?.split(' ')[0] || 'Champion'}!
          </h1>
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground">
              Let's continue your transformation journey.
            </p>
            <ProfileSettingsDialog />
          </div>
          {phrases.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {phrases.map((phrase, index) => (
                <span
                  key={index}
                  className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20"
                >
                  {phrase}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="glass border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-xl font-semibold">{stat.value}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Transformation Journey with PACE Milestones */}
        <Card className="glass border-border/50 neon-border mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Your Transformation Journey
              {isPaceEnabled && (
                <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full ml-2">
                  PACE Mode
                </span>
              )}
            </CardTitle>
            {!isPaceEnabled && <PaceModeSetup />}
          </CardHeader>
          <CardContent>
            <TransformationTimeline 
              onUploadPhoto={() => {
                photoUploaderRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            <div ref={photoUploaderRef} className="flex flex-wrap gap-3 mt-4 items-center border-t border-border/50 pt-4">
              <ProgressPhotoUploader onUpload={uploadPhoto} isUploading={isUploading} />
              <ProgressPhotoGallery photos={photos} onDelete={deletePhoto} />
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Workout Hub */}
          <WorkoutHub
            logs={logs}
            todayLogs={todayLogs}
            activeWorkout={activeWorkout}
            isLoading={workoutLoading}
            createTodayLog={createTodayLog}
            completeWorkout={completeWorkout}
            updateExercise={updateExercise}
            todayCompletedCount={todayCompletedCount}
            completedCount={completedCount}
          />

          {/* Nutrition Today */}
          <Card className="glass border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Apple className="w-5 h-5 text-primary" />
                Today's Nutrition
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-xl font-display font-bold text-primary">{todayTotals.calories}</div>
                  <p className="text-xs text-muted-foreground">cal</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-xl font-display font-bold text-blue-400">{todayTotals.protein}g</div>
                  <p className="text-xs text-muted-foreground">protein</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-xl font-display font-bold text-green-400">{todayTotals.carbs}g</div>
                  <p className="text-xs text-muted-foreground">carbs</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/50">
                  <div className="text-xl font-display font-bold text-yellow-400">{todayTotals.fat}g</div>
                  <p className="text-xs text-muted-foreground">fat</p>
                </div>
              </div>
              
              {meals.length > 0 ? (
                <div className="space-y-2 mb-4">
                  {meals.slice(0, 3).map((meal) => (
                    <div 
                      key={meal.id} 
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                    >
                      <span className="font-medium truncate">{meal.name}</span>
                      <span className="text-muted-foreground text-xs">{meal.calories} cal</span>
                    </div>
                  ))}
                  {meals.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{meals.length - 3} more meal{meals.length - 3 !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">
                  No meals logged yet today
                </p>
              )}
              
              <Link to="/nutrition">
                <Button variant="outline" className="w-full">
                  {meals.length > 0 ? 'View All Meals' : 'Log Meal'}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* AI Fitness Buddy */}
          <FitnessBuddyChat />

          {/* Admin Controls */}
          <AdminExerciseManager />
        </div>
      </main>
    </div>
  );
}
