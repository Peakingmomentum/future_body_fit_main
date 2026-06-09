import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

export interface PaceMilestone {
  id: string;
  user_id: string;
  program_start_date: string;
  week_number: number;
  target_weight: number | null;
  ai_image_url: string | null;
  status: 'pending' | 'generated' | 'compared';
  created_at: string;
  generated_at: string | null;
}

export function usePaceMilestones() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  // Use React Query for milestones - this ensures all components share the same cache
  const { data: milestones = [], isLoading, refetch: refetchMilestones } = useQuery({
    queryKey: ['pace-milestones', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('pace_milestones')
        .select('*')
        .eq('user_id', user.id)
        .order('week_number', { ascending: true });

      if (error) throw error;
      return (data as PaceMilestone[]) || [];
    },
    enabled: !!user,
  });

  const initializePaceMode = async (programDurationWeeks: number = 12) => {
    if (!user || !profile) {
      toast({ title: 'Error', description: 'Please log in to enable PACE mode', variant: 'destructive' });
      return false;
    }

    if (!profile.current_weight || !profile.goal_weight || !profile.before_photo_url) {
      toast({ 
        title: 'Missing Information', 
        description: 'Please set your current weight, goal weight, and upload a before photo first',
        variant: 'destructive' 
      });
      return false;
    }

    try {
      const startDate = new Date().toISOString().split('T')[0];
      
      // Update profile with PACE mode settings - use mutateAsync pattern
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          pace_mode_enabled: true,
          program_start_date: startDate,
          program_duration_weeks: programDurationWeeks
        })
        .eq('user_id', user.id);

      if (profileError) throw profileError;

      // Calculate weekly milestones (Week 1 first, then every 2 weeks)
      const currentWeight = Number(profile.current_weight);
      const goalWeight = Number(profile.goal_weight);
      const weeklyWeightChange = (currentWeight - goalWeight) / programDurationWeeks;

      const milestonesToCreate = [];
      
      // Add Week 1 milestone for immediate generation
      milestonesToCreate.push({
        user_id: user.id,
        program_start_date: startDate,
        week_number: 1,
        target_weight: Math.round((currentWeight - weeklyWeightChange) * 10) / 10,
        status: 'pending'
      });
      
      // Add milestones every 2 weeks after that
      for (let week = 2; week <= programDurationWeeks; week += 2) {
        const targetWeight = currentWeight - (weeklyWeightChange * week);
        milestonesToCreate.push({
          user_id: user.id,
          program_start_date: startDate,
          week_number: week,
          target_weight: Math.round(targetWeight * 10) / 10,
          status: 'pending'
        });
      }

      const { error } = await supabase
        .from('pace_milestones')
        .insert(milestonesToCreate);

      if (error) throw error;

      // Invalidate both queries to ensure all components refresh
      await queryClient.invalidateQueries({ queryKey: ['pace-milestones', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      
      toast({ title: 'PACE Mode Enabled!', description: 'Your transformation milestones have been created' });
      return true;
    } catch (error) {
      console.error('Error initializing PACE mode:', error);
      toast({ title: 'Error', description: 'Failed to initialize PACE mode', variant: 'destructive' });
      return false;
    }
  };

  const generateMilestoneImage = async (milestoneId: string) => {
    if (!user || !profile) return null;

    const milestone = milestones.find(m => m.id === milestoneId);
    if (!milestone) return null;

    try {
      setIsGenerating(true);

      const { data, error } = await supabase.functions.invoke('generate-pace-milestone', {
        body: {
          beforePhotoUrl: profile.before_photo_url,
          currentWeight: Number(profile.current_weight),
          targetWeight: milestone.target_weight,
          goalWeight: Number(profile.goal_weight),
          weekNumber: milestone.week_number,
          totalWeeks: profile.program_duration_weeks || 12,
          goalType: profile.goal_type || 'general'
        }
      });

      if (error) throw error;

      if (data?.imageUrl) {
        // Update milestone with generated image
        await supabase
          .from('pace_milestones')
          .update({
            ai_image_url: data.imageUrl,
            status: 'generated',
            generated_at: new Date().toISOString()
          })
          .eq('id', milestoneId);

        // Invalidate to refresh all components
        await queryClient.invalidateQueries({ queryKey: ['pace-milestones', user.id] });
        
        toast({ title: 'Milestone Generated!', description: `Week ${milestone.week_number} prediction is ready` });
        return data.imageUrl;
      }
    } catch (error) {
      console.error('Error generating milestone:', error);
      toast({ title: 'Error', description: 'Failed to generate milestone image', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
    return null;
  };

  const getCurrentWeek = () => {
    if (!profile?.program_start_date) return 0;
    const startDate = new Date(profile.program_start_date);
    const now = new Date();
    const diffTime = now.getTime() - startDate.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
    return Math.max(0, diffWeeks);
  };

  const getCurrentMilestone = () => {
    const currentWeek = getCurrentWeek();
    // Find the next upcoming milestone or the most recent one
    return milestones.find(m => m.week_number >= currentWeek) || milestones[milestones.length - 1];
  };

  const getPaceStatus = (actualWeight: number | null) => {
    if (!actualWeight || !profile?.current_weight || !profile?.goal_weight) {
      return { status: 'unknown', difference: 0, message: 'Track your weight to see your pace' };
    }

    const currentMilestone = getCurrentMilestone();
    if (!currentMilestone?.target_weight) {
      return { status: 'unknown', difference: 0, message: 'No milestone data available' };
    }

    const difference = actualWeight - currentMilestone.target_weight;
    
    if (Math.abs(difference) <= 2) {
      return { status: 'on-pace', difference, message: 'You\'re on track! 🎯' };
    } else if (difference > 0) {
      return { status: 'behind', difference, message: `${difference.toFixed(1)} lbs behind pace` };
    } else {
      return { status: 'ahead', difference: Math.abs(difference), message: `${Math.abs(difference).toFixed(1)} lbs ahead of pace! 🚀` };
    }
  };

  const disablePaceMode = async () => {
    if (!user) return;

    try {
      // Delete all milestones
      await supabase
        .from('pace_milestones')
        .delete()
        .eq('user_id', user.id);

      // Update profile
      await supabase
        .from('profiles')
        .update({
          pace_mode_enabled: false,
          program_start_date: null,
          program_duration_weeks: null
        })
        .eq('user_id', user.id);

      // Invalidate both queries
      await queryClient.invalidateQueries({ queryKey: ['pace-milestones', user.id] });
      await queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
      
      toast({ title: 'PACE Mode Disabled', description: 'Your milestones have been removed' });
    } catch (error) {
      console.error('Error disabling PACE mode:', error);
      toast({ title: 'Error', description: 'Failed to disable PACE mode', variant: 'destructive' });
    }
  };

  return {
    milestones,
    isLoading,
    isGenerating,
    isPaceEnabled: profile?.pace_mode_enabled || false,
    programStartDate: profile?.program_start_date,
    programDurationWeeks: profile?.program_duration_weeks || 12,
    currentWeek: getCurrentWeek(),
    currentMilestone: getCurrentMilestone(),
    initializePaceMode,
    generateMilestoneImage,
    getPaceStatus,
    disablePaceMode,
    refetch: refetchMilestones
  };
}
