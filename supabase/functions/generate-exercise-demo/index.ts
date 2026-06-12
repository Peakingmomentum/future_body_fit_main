import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exerciseName, description, targetMuscles } = await req.json();
    
    if (!exerciseName) {
      return new Response(
        JSON.stringify({ error: 'Exercise name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const AI_GATEWAY_API_KEY = Deno.env.get('AI_GATEWAY_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!AI_GATEWAY_API_KEY) {
      throw new Error('AI_GATEWAY_API_KEY is not configured');
    }

    // Create a cache key from the exercise name
    const cacheKey = exerciseName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    
    // Check if we already have this image cached in storage
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { data: existingFile } = await supabase.storage
      .from('user-photos')
      .list('exercise-demos', { search: cacheKey });

    if (existingFile && existingFile.length > 0) {
      const { data: publicUrl } = supabase.storage
        .from('user-photos')
        .getPublicUrl(`exercise-demos/${existingFile[0].name}`);
      
      console.log('Returning cached exercise demo:', publicUrl.publicUrl);
      return new Response(
        JSON.stringify({ imageUrl: publicUrl.publicUrl, cached: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate a demonstration image
    const muscleContext = targetMuscles?.length > 0 
      ? `targeting ${targetMuscles.join(', ')}` 
      : '';
    
    const prompt = `Create a clean, professional fitness illustration showing the proper form for the exercise "${exerciseName}". ${description ? `The movement: ${description}` : ''} ${muscleContext}. Show a fit athletic person demonstrating the exercise with correct posture and body alignment. Use a simple gym or neutral background. Style: modern fitness app illustration, clean lines, professional quality.`;

    console.log('Generating exercise demo with prompt:', prompt);

    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        modalities: ['image', 'text'],
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
          JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error('No image in response:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Failed to generate image' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upload to Supabase storage for caching
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const imageBuffer = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    
    const fileName = `exercise-demos/${cacheKey}-${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('user-photos')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true,
      });

    if (uploadError) {
      console.error('Failed to cache image:', uploadError);
      // Return the base64 image even if caching fails
      return new Response(
        JSON.stringify({ imageUrl: imageData, cached: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: publicUrl } = supabase.storage
      .from('user-photos')
      .getPublicUrl(fileName);

    console.log('Generated and cached exercise demo:', publicUrl.publicUrl);
    
    return new Response(
      JSON.stringify({ imageUrl: publicUrl.publicUrl, cached: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error generating exercise demo:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
