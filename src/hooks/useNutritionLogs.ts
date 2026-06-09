import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Meal {
  id: string;
  type: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionLog {
  id: string;
  user_id: string;
  log_date: string;
  meals: Meal[];
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fats: number;
  notes: string | null;
  created_at: string;
}

export function useNutritionLogs() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [todayLog, setTodayLog] = useState<NutritionLog | null>(null);
  const [allLogs, setAllLogs] = useState<NutritionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  const fetchTodayLog = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', today)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setTodayLog({
          ...data,
          meals: (data.meals as unknown as Meal[]) || [],
          total_protein: Number(data.total_protein) || 0,
          total_carbs: Number(data.total_carbs) || 0,
          total_fats: Number(data.total_fats) || 0,
        });
      } else {
        setTodayLog(null);
      }
    } catch (error) {
      console.error('Error fetching nutrition log:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAllLogs = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('nutrition_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('log_date', { ascending: false });

      if (error) throw error;

      if (data) {
        setAllLogs(data.map(log => ({
          ...log,
          meals: (log.meals as unknown as Meal[]) || [],
          total_protein: Number(log.total_protein) || 0,
          total_carbs: Number(log.total_carbs) || 0,
          total_fats: Number(log.total_fats) || 0,
        })));
      }
    } catch (error) {
      console.error('Error fetching all nutrition logs:', error);
    }
  };

  useEffect(() => {
    fetchTodayLog();
    fetchAllLogs();
  }, [user]);

  const addMeal = async (meal: Omit<Meal, 'id'>) => {
    if (!user) return null;

    const newMeal: Meal = { ...meal, id: Date.now().toString() };
    const updatedMeals = [...(todayLog?.meals || []), newMeal];
    const totals = calculateTotals(updatedMeals);

    try {
      if (todayLog) {
        // Update existing log
        const { error } = await supabase
          .from('nutrition_logs')
          .update({
            meals: JSON.parse(JSON.stringify(updatedMeals)),
            total_calories: totals.calories,
            total_protein: totals.protein,
            total_carbs: totals.carbs,
            total_fats: totals.fat,
          })
          .eq('id', todayLog.id);

        if (error) throw error;
      } else {
        // Create new log
        const { error } = await supabase
          .from('nutrition_logs')
          .insert({
            user_id: user.id,
            log_date: today,
            meals: JSON.parse(JSON.stringify(updatedMeals)),
            total_calories: totals.calories,
            total_protein: totals.protein,
            total_carbs: totals.carbs,
            total_fats: totals.fat,
          });

        if (error) throw error;
      }

      await fetchTodayLog();
      return newMeal;
    } catch (error: any) {
      toast({ title: 'Error adding meal', description: error.message, variant: 'destructive' });
      return null;
    }
  };

  const removeMeal = async (mealId: string) => {
    if (!user || !todayLog) return;

    const updatedMeals = todayLog.meals.filter(m => m.id !== mealId);
    const totals = calculateTotals(updatedMeals);

    try {
      const { error } = await supabase
        .from('nutrition_logs')
        .update({
          meals: JSON.parse(JSON.stringify(updatedMeals)),
          total_calories: totals.calories,
          total_protein: totals.protein,
          total_carbs: totals.carbs,
          total_fats: totals.fat,
        })
        .eq('id', todayLog.id);

      if (error) throw error;
      await fetchTodayLog();
    } catch (error: any) {
      toast({ title: 'Error removing meal', description: error.message, variant: 'destructive' });
    }
  };

  const calculateTotals = (meals: Meal[]) => {
    return meals.reduce(
      (sum, meal) => ({
        calories: sum.calories + (meal.calories || 0),
        protein: sum.protein + (meal.protein || 0),
        carbs: sum.carbs + (meal.carbs || 0),
        fat: sum.fat + (meal.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  };

  const todayTotals = todayLog
    ? {
        calories: todayLog.total_calories || 0,
        protein: todayLog.total_protein || 0,
        carbs: todayLog.total_carbs || 0,
        fat: todayLog.total_fats || 0,
      }
    : { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return {
    todayLog,
    meals: todayLog?.meals || [],
    todayTotals,
    allLogs,
    isLoading,
    addMeal,
    removeMeal,
    refetch: fetchTodayLog,
  };
}
