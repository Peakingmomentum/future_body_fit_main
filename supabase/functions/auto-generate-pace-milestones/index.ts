import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting auto-generation of PACE milestones...');

    // Get all users with PACE mode enabled
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('user_id, before_photo_url, current_weight, goal_weight, goal_type, program_start_date, program_duration_weeks')
      .eq('pace_mode_enabled', true)
      .not('before_photo_url', 'is', null)
      .not('current_weight', 'is', null)
      .not('goal_weight', 'is', null);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    console.log(`Found ${profiles?.length || 0} users with PACE mode enabled`);

    const results = [];

    for (const profile of profiles || []) {
      // Calculate current week for this user
      const startDate = new Date(profile.program_start_date);
      const now = new Date();
      const diffTime = now.getTime() - startDate.getTime();
      const currentWeek = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

      console.log(`User ${profile.user_id}: Current week is ${currentWeek}`);

      // Find milestones that are due (week_number <= currentWeek + 1) but not yet generated
      // This generates upcoming milestones in advance so they're ready when the week starts
      const { data: pendingMilestones, error: milestonesError } = await supabase
        .from('pace_milestones')
        .select('*')
        .eq('user_id', profile.user_id)
        .eq('status', 'pending')
        .lte('week_number', currentWeek + 1)
        .order('week_number', { ascending: true })
        .limit(1); // Only generate one at a time to avoid rate limits

      if (milestonesError) {
        console.error(`Error fetching milestones for user ${profile.user_id}:`, milestonesError);
        continue;
      }

      if (!pendingMilestones || pendingMilestones.length === 0) {
        console.log(`No pending milestones for user ${profile.user_id}`);
        continue;
      }

      const milestone = pendingMilestones[0];
      console.log(`Generating milestone for week ${milestone.week_number} for user ${profile.user_id}`);

      // Call the generate-pace-milestone function
      try {
        const generateResponse = await fetch(`${supabaseUrl}/functions/v1/generate-pace-milestone`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            beforePhotoUrl: profile.before_photo_url,
            currentWeight: Number(profile.current_weight),
            targetWeight: milestone.target_weight,
            goalWeight: Number(profile.goal_weight),
            weekNumber: milestone.week_number,
            totalWeeks: profile.program_duration_weeks || 12,
            goalType: profile.goal_type || 'general'
          }),
        });

        if (!generateResponse.ok) {
          const errorText = await generateResponse.text();
          console.error(`Failed to generate milestone for user ${profile.user_id}:`, errorText);
          results.push({
            user_id: profile.user_id,
            week_number: milestone.week_number,
            status: 'error',
            error: errorText
          });
          continue;
        }

        const generateData = await generateResponse.json();

        if (generateData.imageUrl) {
          // Update the milestone with the generated image
          const { error: updateError } = await supabase
            .from('pace_milestones')
            .update({
              ai_image_url: generateData.imageUrl,
              status: 'generated',
              generated_at: new Date().toISOString()
            })
            .eq('id', milestone.id);

          if (updateError) {
            console.error(`Error updating milestone:`, updateError);
            results.push({
              user_id: profile.user_id,
              week_number: milestone.week_number,
              status: 'error',
              error: updateError.message
            });
          } else {
            console.log(`Successfully generated week ${milestone.week_number} for user ${profile.user_id}`);
            results.push({
              user_id: profile.user_id,
              week_number: milestone.week_number,
              status: 'success'
            });
          }
        }
      } catch (genError) {
        console.error(`Generation error for user ${profile.user_id}:`, genError);
        results.push({
          user_id: profile.user_id,
          week_number: milestone.week_number,
          status: 'error',
          error: genError instanceof Error ? genError.message : 'Unknown error'
        });
      }
    }

    console.log('Auto-generation complete:', results);

    return new Response(
      JSON.stringify({ 
        message: 'Auto-generation complete',
        processed: results.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in auto-generate-pace-milestones:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
