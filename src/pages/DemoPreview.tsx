import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useProfile } from '@/hooks/useProfile';
import { 
  Zap, 
  Dumbbell, 
  Apple, 
  ArrowRight, 
  ArrowLeft, 
  Check,
  Clock,
  Flame,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

// Sample workout based on goal type
const getSampleWorkout = (goalType: string | null | undefined) => {
  const workouts = {
    weight_loss: {
      name: "Fat Burning HIIT",
      duration: "35 min",
      calories: "350-450",
      exercises: [
        { name: "Jumping Jacks", sets: 3, reps: "30 sec", rest: "15 sec" },
        { name: "Mountain Climbers", sets: 3, reps: "30 sec", rest: "15 sec" },
        { name: "Burpees", sets: 3, reps: "10", rest: "30 sec" },
        { name: "High Knees", sets: 3, reps: "30 sec", rest: "15 sec" },
        { name: "Squat Jumps", sets: 3, reps: "12", rest: "30 sec" },
      ]
    },
    muscle_gain: {
      name: "Upper Body Strength",
      duration: "45 min",
      calories: "250-350",
      exercises: [
        { name: "Push-ups", sets: 4, reps: "12", rest: "60 sec" },
        { name: "Dumbbell Rows", sets: 4, reps: "10 each", rest: "60 sec" },
        { name: "Shoulder Press", sets: 3, reps: "12", rest: "60 sec" },
        { name: "Bicep Curls", sets: 3, reps: "12", rest: "45 sec" },
        { name: "Tricep Dips", sets: 3, reps: "15", rest: "45 sec" },
      ]
    },
    toning: {
      name: "Full Body Sculpt",
      duration: "40 min",
      calories: "300-400",
      exercises: [
        { name: "Goblet Squats", sets: 3, reps: "15", rest: "45 sec" },
        { name: "Lunges", sets: 3, reps: "12 each", rest: "45 sec" },
        { name: "Plank", sets: 3, reps: "45 sec", rest: "30 sec" },
        { name: "Glute Bridges", sets: 3, reps: "15", rest: "30 sec" },
        { name: "Russian Twists", sets: 3, reps: "20", rest: "30 sec" },
      ]
    },
    default: {
      name: "Total Body Workout",
      duration: "40 min",
      calories: "300-400",
      exercises: [
        { name: "Squats", sets: 3, reps: "15", rest: "45 sec" },
        { name: "Push-ups", sets: 3, reps: "12", rest: "45 sec" },
        { name: "Lunges", sets: 3, reps: "10 each", rest: "45 sec" },
        { name: "Plank", sets: 3, reps: "30 sec", rest: "30 sec" },
        { name: "Jumping Jacks", sets: 3, reps: "30", rest: "30 sec" },
      ]
    }
  };

  return workouts[goalType as keyof typeof workouts] || workouts.default;
};

// Sample meal plan based on goal type
const getSampleMealPlan = (goalType: string | null | undefined) => {
  const plans = {
    weight_loss: {
      totalCalories: 1600,
      meals: [
        { name: "Breakfast", time: "7:00 AM", food: "Greek yogurt with berries and almonds", calories: 350, protein: 20 },
        { name: "Lunch", time: "12:00 PM", food: "Grilled chicken salad with olive oil dressing", calories: 450, protein: 35 },
        { name: "Snack", time: "3:00 PM", food: "Apple with almond butter", calories: 200, protein: 5 },
        { name: "Dinner", time: "7:00 PM", food: "Baked salmon with roasted vegetables", calories: 500, protein: 40 },
      ]
    },
    muscle_gain: {
      totalCalories: 2800,
      meals: [
        { name: "Breakfast", time: "7:00 AM", food: "4 eggs, oatmeal with banana and peanut butter", calories: 650, protein: 35 },
        { name: "Lunch", time: "12:00 PM", food: "Chicken breast, brown rice, and broccoli", calories: 700, protein: 50 },
        { name: "Snack", time: "3:00 PM", food: "Protein shake with banana", calories: 350, protein: 30 },
        { name: "Dinner", time: "7:00 PM", food: "Steak with sweet potato and asparagus", calories: 800, protein: 55 },
        { name: "Evening", time: "9:00 PM", food: "Cottage cheese with mixed nuts", calories: 300, protein: 25 },
      ]
    },
    default: {
      totalCalories: 2000,
      meals: [
        { name: "Breakfast", time: "7:00 AM", food: "Scrambled eggs with whole wheat toast", calories: 400, protein: 22 },
        { name: "Lunch", time: "12:00 PM", food: "Turkey sandwich with side salad", calories: 550, protein: 35 },
        { name: "Snack", time: "3:00 PM", food: "Mixed nuts and fruit", calories: 250, protein: 8 },
        { name: "Dinner", time: "7:00 PM", food: "Grilled fish with quinoa and vegetables", calories: 600, protein: 40 },
      ]
    }
  };

  return plans[goalType as keyof typeof plans] || plans.default;
};

export default function DemoPreview() {
  const [expandedWorkout, setExpandedWorkout] = useState(true);
  const [expandedNutrition, setExpandedNutrition] = useState(true);
  const navigate = useNavigate();
  const { profile } = useProfile();

  const workout = getSampleWorkout(profile?.goal_type);
  const mealPlan = getSampleMealPlan(profile?.goal_type);

  const handleSubscribe = () => {
    navigate('/pricing');
  };

  return (
    <div className="min-h-screen bg-background dark p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />
      
      <div className="relative max-w-4xl mx-auto">
        {/* Back button */}
        <Link 
          to="/transformation" 
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to transformation
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Zap className="w-8 h-8 text-primary" />
            <span className="text-2xl font-display font-bold">FitFuture</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
            Your Personalized Plan Preview
          </h1>
          <p className="text-lg text-muted-foreground">
            Here's a sample of what your {profile?.goal_type?.replace('_', ' ') || 'fitness'} journey looks like
          </p>
        </div>

        {/* Workout Preview */}
        <Card className="glass border-border/50 mb-6">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedWorkout(!expandedWorkout)}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{workout.name}</h2>
                  <p className="text-sm text-muted-foreground font-normal">Today's Workout</p>
                </div>
              </div>
              {expandedWorkout ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </CardTitle>
          </CardHeader>
          {expandedWorkout && (
            <CardContent className="pt-0">
              <div className="flex gap-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  {workout.duration}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Flame className="w-4 h-4" />
                  {workout.calories} cal
                </div>
              </div>
              
              <div className="space-y-3">
                {workout.exercises.map((exercise, index) => (
                  <div 
                    key={index} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{exercise.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {exercise.sets} sets × {exercise.reps}
                        </p>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Rest: {exercise.rest}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="w-4 h-4 text-primary" />
                  Personalized based on your {profile?.fitness_level || 'beginner'} fitness level
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Nutrition Preview */}
        <Card className="glass border-border/50 mb-8">
          <CardHeader 
            className="cursor-pointer"
            onClick={() => setExpandedNutrition(!expandedNutrition)}
          >
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Apple className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Daily Nutrition Plan</h2>
                  <p className="text-sm text-muted-foreground font-normal">{mealPlan.totalCalories} calories target</p>
                </div>
              </div>
              {expandedNutrition ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </CardTitle>
          </CardHeader>
          {expandedNutrition && (
            <CardContent className="pt-0">
              <div className="space-y-4">
                {mealPlan.meals.map((meal, index) => (
                  <div 
                    key={index} 
                    className="flex items-start justify-between p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{meal.name}</p>
                        <span className="text-xs text-muted-foreground">• {meal.time}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{meal.food}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{meal.calories} cal</p>
                      <p className="text-xs text-muted-foreground">{meal.protein}g protein</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-accent/5 rounded-lg border border-accent/20">
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent" />
                  Optimized for {profile?.goal_type?.replace('_', ' ') || 'your goals'}
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* CTA Section */}
        <div className="text-center">
          <Button size="lg" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
