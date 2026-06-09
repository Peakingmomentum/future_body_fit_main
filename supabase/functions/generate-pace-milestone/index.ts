import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      beforePhotoUrl, 
      currentWeight, 
      targetWeight, 
      goalWeight, 
      weekNumber, 
      totalWeeks,
      goalType 
    } = await req.json();

    console.log('Generating PACE milestone for week:', weekNumber);
    console.log('Goal type:', goalType);
    console.log('Current weight:', currentWeight, 'Target:', targetWeight, 'Goal:', goalWeight);

    if (!beforePhotoUrl) {
      return new Response(
        JSON.stringify({ error: 'Before photo URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate transformation percentage
    const totalChange = currentWeight - goalWeight;
    const currentChange = currentWeight - targetWeight;
    const progressPercentage = totalChange > 0 ? Math.round((currentChange / totalChange) * 100) : 0;

    console.log('Progress percentage:', progressPercentage, '%');

    // Generate progressive transformation description based on percentage
    let transformationDesc = '';
    if (progressPercentage <= 15) {
      transformationDesc = 'very subtle initial changes - slightly more toned, minor visible improvements, same overall body structure';
    } else if (progressPercentage <= 30) {
      transformationDesc = 'early visible progress - noticeably more toned, slight reduction in body fat, improved posture';
    } else if (progressPercentage <= 50) {
      transformationDesc = 'significant midway transformation - clearly more defined muscles, visibly leaner physique, halfway to the goal';
    } else if (progressPercentage <= 70) {
      transformationDesc = 'substantial progress - much more muscular definition, significantly leaner, approaching goal physique';
    } else if (progressPercentage <= 85) {
      transformationDesc = 'near-complete transformation - highly defined muscles, very lean physique, almost at the goal body';
    } else {
      transformationDesc = 'full transformation achieved - peak muscle definition, optimal leanness, goal physique attained';
    }

    // Add goal-specific adjustments
    const goalAdjustments: Record<string, string> = {
      weight_loss: 'with emphasis on fat loss, slimmer waist, and reduced body volume',
      muscle_gain: 'with emphasis on increased muscle mass, broader shoulders, and larger arms',
      toning: 'with emphasis on lean muscle definition and athletic appearance',
      strength: 'with emphasis on overall strength appearance and functional muscle',
      general: 'with balanced improvements in overall fitness and body composition'
    };

    const goalSpecific = goalAdjustments[goalType] || goalAdjustments.general;

    // System instructions for consistent output
    const systemPrompt = `You are a fitness transformation visualization AI. Your role is to generate realistic body transformation preview images.

ABSOLUTE RULES - NEVER BREAK THESE:
1. OUTPUT FORMAT: Always generate images in PORTRAIT orientation (3:4 aspect ratio, taller than wide). The height must be greater than the width.
2. IDENTITY PRESERVATION: The person must remain 100% recognizable - same face, skin tone, hair color, hair style, facial features.
3. CLOTHING: Keep the exact same clothing/outfit visible in the original photo.
4. SETTING: Maintain the identical background, lighting, and environment.
5. POSE: Preserve the exact same body pose and camera angle.
6. REALISM: All body changes must look natural and physically achievable through diet and exercise.
7. CONSISTENCY: Each milestone should show gradual, believable progress - never dramatic overnight changes.`;

    const userPrompt = `Transform this person's body to show ${transformationDesc} ${goalSpecific}. This represents week ${weekNumber} of a ${totalWeeks}-week fitness program (${progressPercentage}% progress toward their goal).

SPECIFIC REQUIREMENTS FOR THIS MILESTONE:
- Target weight: ${targetWeight} lbs (started at ${currentWeight} lbs, goal is ${goalWeight} lbs)
- Progress: ${progressPercentage}% toward goal
- Week: ${weekNumber} of ${totalWeeks}

Remember: PORTRAIT orientation (3:4 ratio, taller than wide), preserve identity, realistic gradual changes only.`;

    console.log('Sending request to AI gateway for milestone generation');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3.1-flash-image-preview',
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              { type: 'image_url', image_url: { url: beforePhotoUrl } }
            ]
          }
        ],
        modalities: ['image', 'text']
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add more credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Failed to generate milestone image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response received successfully');

    const generatedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!generatedImageUrl) {
      console.error('No image URL in response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'No image generated' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('PACE milestone generated successfully for week', weekNumber);

    return new Response(
      JSON.stringify({ 
        imageUrl: generatedImageUrl,
        weekNumber,
        progressPercentage,
        targetWeight
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-pace-milestone:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
