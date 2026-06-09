import { useState } from 'react';
import { AppNav } from '@/components/AppNav';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, Apple, Plus, Trash2, Sparkles, Loader2, RefreshCw, ChevronDown, Calendar } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { useNutritionLogs, Meal } from '@/hooks/useNutritionLogs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface SuggestedMeal {
  type: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
}

export default function Nutrition() {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { toast } = useToast();
  const { meals, todayTotals, allLogs, addMeal, removeMeal, isLoading } = useNutritionLogs();
  const today = new Date().toISOString().split('T')[0];
  const pastLogs = allLogs.filter(log => log.log_date !== today);
  const [isOpen, setIsOpen] = useState(false);
  const [mealType, setMealType] = useState('breakfast');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [suggestedMeals, setSuggestedMeals] = useState<SuggestedMeal[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null);

  // Calculate macros based on user profile
  const calculateMacros = () => {
    const weight = profile?.current_weight || 150;
    const height = profile?.height || 170;
    const age = profile?.age || 30;
    const gender = profile?.gender || 'male';
    const goalType = profile?.goal_type || 'general';

    // BMR using Mifflin-St Jeor equation
    let bmr: number;
    if (gender === 'male') {
      bmr = (10 * weight * 0.453592) + (6.25 * height) - (5 * age) + 5;
    } else {
      bmr = (10 * weight * 0.453592) + (6.25 * height) - (5 * age) - 161;
    }

    // TDEE with moderate activity multiplier
    const tdee = bmr * 1.55;

    // Adjust for goal
    let targetCalories: number;
    let proteinRatio: number, carbRatio: number, fatRatio: number;

    switch (goalType) {
      case 'weight_loss':
        targetCalories = tdee - 500;
        proteinRatio = 0.40;
        carbRatio = 0.35;
        fatRatio = 0.25;
        break;
      case 'muscle_gain':
        targetCalories = tdee + 300;
        proteinRatio = 0.30;
        carbRatio = 0.45;
        fatRatio = 0.25;
        break;
      default:
        targetCalories = tdee;
        proteinRatio = 0.30;
        carbRatio = 0.40;
        fatRatio = 0.30;
    }

    return {
      calories: Math.round(targetCalories),
      protein: Math.round((targetCalories * proteinRatio) / 4),
      carbs: Math.round((targetCalories * carbRatio) / 4),
      fat: Math.round((targetCalories * fatRatio) / 9),
    };
  };

  const targets = calculateMacros();

  const totals = todayTotals;

  const handleAddMeal = async () => {
    if (!foodName || !calories) return;
    
    await addMeal({
      type: mealType,
      name: foodName,
      calories: parseInt(calories) || 0,
      protein: parseInt(protein) || 0,
      carbs: parseInt(carbs) || 0,
      fat: parseInt(fat) || 0,
    });
    
    setFoodName('');
    setCalories('');
    setProtein('');
    setCarbs('');
    setFat('');
    setIsOpen(false);
  };

  const handleDeleteMeal = async (id: string) => {
    await removeMeal(id);
  };

  const handleLogSuggestedMeal = async (suggested: SuggestedMeal) => {
    await addMeal({
      type: suggested.type,
      name: suggested.name,
      calories: suggested.calories,
      protein: suggested.protein,
      carbs: suggested.carbs,
      fat: suggested.fat,
    });
    toast({
      title: "Meal logged!",
      description: `${suggested.name} has been added to your daily log.`,
    });
  };

  const generateMealSuggestions = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          dailyCalories: targets.calories,
          proteinGrams: targets.protein,
          carbsGrams: targets.carbs,
          fatsGrams: targets.fat,
          goalType: profile?.goal_type || 'general',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate meals');
      }

      const data = await response.json();
      setSuggestedMeals(data.meals);
      toast({
        title: "Meals generated!",
        description: "AI has created a personalized meal plan for you.",
      });
    } catch (error) {
      console.error('Error generating meals:', error);
      toast({
        title: "Generation failed",
        description: error instanceof Error ? error.message : "Could not generate meal suggestions.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const regenerateMeal = async (mealType: string) => {
    setRegeneratingMeal(mealType);
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-meals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          dailyCalories: targets.calories,
          proteinGrams: targets.protein,
          carbsGrams: targets.carbs,
          fatsGrams: targets.fat,
          goalType: profile?.goal_type || 'general',
          regenerateMealType: mealType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate meal');
      }

      const data = await response.json();
      if (data.meals && data.meals.length > 0) {
        setSuggestedMeals(prev => 
          prev.map(meal => meal.type === mealType ? data.meals[0] : meal)
        );
        toast({
          title: "Meal regenerated!",
          description: `New ${mealType} suggestion ready.`,
        });
      }
    } catch (error) {
      console.error('Error regenerating meal:', error);
      toast({
        title: "Regeneration failed",
        description: error instanceof Error ? error.message : "Could not regenerate meal.",
        variant: "destructive",
      });
    } finally {
      setRegeneratingMeal(null);
    }
  };

  const mealTypeLabels: Record<string, string> = {
    breakfast: 'Breakfast',
    lunch: 'Lunch',
    dinner: 'Dinner',
    snack: 'Snack',
  };

  const getProgress = (current: number, target: number) => 
    Math.min(Math.round((current / target) * 100), 100);

  return (
    <div className="min-h-screen bg-background dark">
      <AppNav />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
      
      <header className="relative border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-display font-bold">Nutrition Tracker</h1>
        </div>
      </header>

      <main className="relative max-w-4xl mx-auto px-6 py-8 space-y-6">
        {/* Macro Targets */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Apple className="w-5 h-5 text-primary" />
              Daily Targets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-display font-bold text-primary">{targets.calories}</div>
                <p className="text-xs text-muted-foreground">calories</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-display font-bold text-blue-400">{targets.protein}g</div>
                <p className="text-xs text-muted-foreground">protein</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-display font-bold text-green-400">{targets.carbs}g</div>
                <p className="text-xs text-muted-foreground">carbs</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <div className="text-2xl font-display font-bold text-yellow-400">{targets.fat}g</div>
                <p className="text-xs text-muted-foreground">fat</p>
              </div>
            </div>

            {/* Progress Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Calories</span>
                  <span className="text-muted-foreground">{totals.calories} / {targets.calories}</span>
                </div>
                <Progress value={getProgress(totals.calories, targets.calories)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Protein</span>
                  <span className="text-muted-foreground">{totals.protein}g / {targets.protein}g</span>
                </div>
                <Progress value={getProgress(totals.protein, targets.protein)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Carbs</span>
                  <span className="text-muted-foreground">{totals.carbs}g / {targets.carbs}g</span>
                </div>
                <Progress value={getProgress(totals.carbs, targets.carbs)} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Fat</span>
                  <span className="text-muted-foreground">{totals.fat}g / {targets.fat}g</span>
                </div>
                <Progress value={getProgress(totals.fat, targets.fat)} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Generate Meals Button */}
        <Button 
          onClick={generateMealSuggestions} 
          disabled={isGenerating}
          className="w-full gap-2"
          variant="outline"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4" />
          )}
          {isGenerating ? 'Generating...' : 'Generate AI Meal Suggestions'}
        </Button>

        {/* Suggested Meals */}
        {suggestedMeals.length > 0 && (
          <Card className="glass border-border/50 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                AI Suggested Meals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {suggestedMeals.map((meal, index) => (
                <div 
                  key={index}
                  className="p-4 rounded-lg bg-muted/50 border border-border/50"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-xs text-primary font-medium uppercase">{meal.type}</span>
                      <h4 className="font-semibold">{meal.name}</h4>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => regenerateMeal(meal.type)}
                        disabled={regeneratingMeal === meal.type}
                      >
                        {regeneratingMeal === meal.type ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                      </Button>
                      <Button size="sm" onClick={() => handleLogSuggestedMeal(meal)}>
                        <Plus className="w-3 h-3 mr-1" />
                        Log
                      </Button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-muted-foreground mb-2">
                    <span>{meal.calories} cal</span>
                    <span>{meal.protein}g P</span>
                    <span>{meal.carbs}g C</span>
                    <span>{meal.fat}g F</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {meal.ingredients.join(', ')}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Add Meal Button */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Log Custom Meal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Log a Meal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Meal Type</Label>
                <Select value={mealType} onValueChange={setMealType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Food Name</Label>
                <Input 
                  placeholder="e.g., Grilled Chicken Salad" 
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Calories</Label>
                  <Input 
                    type="number" 
                    placeholder="350" 
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Protein (g)</Label>
                  <Input 
                    type="number" 
                    placeholder="30" 
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Carbs (g)</Label>
                  <Input 
                    type="number" 
                    placeholder="40" 
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fat (g)</Label>
                  <Input 
                    type="number" 
                    placeholder="15" 
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                  />
                </div>
              </div>
              <Button onClick={handleAddMeal} className="w-full">
                Add Meal
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Meals List with Tabs */}
        <Card className="glass border-border/50">
          <CardHeader>
            <CardTitle>Logged Meals</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="today" className="w-full">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="today" className="flex-1">Today</TabsTrigger>
                <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
              </TabsList>
              
              <TabsContent value="today">
                {meals.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No meals logged yet. Start tracking your nutrition!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {meals.map((meal) => (
                      <div 
                        key={meal.id} 
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium">{meal.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {mealTypeLabels[meal.type]} • {meal.calories} cal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F
                          </p>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteMeal(meal.id)}
                        >
                          <Trash2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="history">
                {pastLogs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No past nutrition logs yet. Keep tracking to build your history!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pastLogs.map((log) => (
                      <Collapsible key={log.id}>
                        <CollapsibleTrigger className="w-full">
                          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-primary" />
                              <div className="text-left">
                                <p className="font-medium">
                                  {format(new Date(log.log_date), 'EEEE, MMM d, yyyy')}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {log.total_calories} cal • {log.total_protein}g P • {log.total_carbs}g C • {log.total_fats}g F • {log.meals.length} meals
                                </p>
                              </div>
                            </div>
                            <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </div>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <div className="pl-10 pr-3 py-2 space-y-2">
                            {log.meals.map((meal) => (
                              <div 
                                key={meal.id} 
                                className="p-2 rounded bg-muted/30 text-sm"
                              >
                                <p className="font-medium">{meal.name}</p>
                                <p className="text-muted-foreground">
                                  {mealTypeLabels[meal.type]} • {meal.calories} cal • {meal.protein}g P • {meal.carbs}g C • {meal.fat}g F
                                </p>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                    <p className="text-center text-sm text-muted-foreground pt-4">
                      {pastLogs.length} day{pastLogs.length !== 1 ? 's' : ''} tracked
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
