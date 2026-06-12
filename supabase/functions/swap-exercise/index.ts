import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { exerciseName, focusArea, equipment, currentExercises } = await req.json();
    const AI_GATEWAY_API_KEY = Deno.env.get('AI_GATEWAY_API_KEY');
    
    if (!AI_GATEWAY_API_KEY) {
      throw new Error('AI_GATEWAY_API_KEY is not configured');
    }

    const equipmentDescriptions: Record<string, string> = {
      no_equipment: 'bodyweight only',
      minimal: 'dumbbells, resistance bands, kettlebells',
      home_gym: 'bench, barbell, dumbbells, pull-up bar',
      full_gym: 'full gym with all equipment',
    };

    const equipmentContext = equipmentDescriptions[equipment] || 'bodyweight only';
    const avoidList = (currentExercises || []).join(', ');

    const prompt = `Suggest ONE alternative exercise to replace "${exerciseName}" that targets similar muscles.

Equipment available: ${equipmentContext}
Focus area: ${focusArea || 'general'}
Do NOT suggest any of these exercises (already in the workout): ${avoidList}

Return ONLY a JSON object:
{
  "name": "Exercise name",
  "sets": 3,
  "reps": "12",
  "rest": "60 sec",
  "description": "Step-by-step form instructions",
  "targetMuscles": ["Primary", "Secondary"],
  "tips": ["Form tip 1", "Form tip 2"]
}`;

    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 1.0,
        messages: [
          { role: 'system', content: 'You are an expert fitness trainer. Return valid JSON only — no markdown, no explanations.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted.' }), {
          status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error('No content in AI response');

    let exercise;
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      exercise = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('No JSON found in response');
    }

    return new Response(JSON.stringify({ exercise }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error swapping exercise:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
