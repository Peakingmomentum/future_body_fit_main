import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { goalType, fitnessLevel, gender, focusArea, equipment } = await req.json();
    const AI_GATEWAY_API_KEY = Deno.env.get('AI_GATEWAY_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!AI_GATEWAY_API_KEY) throw new Error('AI_GATEWAY_API_KEY is not configured');
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) throw new Error('Supabase env not configured');

    // Forward caller's JWT so RLS resolves their org via current_org_id().
    // This makes the effective_exercise_library view return: base exercises
    // minus the caller-org's hidden ones, with replacements swapped in,
    // UNION the org's own custom exercises.
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: exerciseRows, error: dbError } = await supabase
      .from('effective_exercise_library')
      .select('name, equipment, media_url, source')
      .not('media_url', 'is', null);

    if (dbError) {
      console.error('Failed to fetch effective exercise library:', dbError);
      throw new Error('Failed to load exercise library');
    }

    // Normalize to the shape the rest of this function expects.
    const allExercises = (exerciseRows || []).map((e: any) => ({
      name: e.name,
      equipment: e.equipment,
      external_video_url: e.media_url,
      source: e.source,
    }));
    console.log(`Loaded ${allExercises.length} exercises from effective library`);

    // Filter by equipment if specified
    const equipmentMap: Record<string, string[]> = {
      no_equipment: ['body weight'],
      minimal: ['body weight', 'dumbbell', 'kettlebell', 'band', 'resistance band'],
      home_gym: ['body weight', 'dumbbell', 'kettlebell', 'band', 'resistance band', 'barbell', 'ez barbell', 'olympic barbell', 'smith machine', 'pull-up bar'],
      full_gym: [], // empty = all equipment allowed
    };

    const allowedEquipment = equipmentMap[equipment] || [];
    const filtered = allowedEquipment.length > 0
      ? allExercises.filter(e => allowedEquipment.some(eq => (e.equipment || '').toLowerCase().includes(eq)))
      : allExercises;

    // Pick a random subset of ~30 for the prompt to keep it manageable
    const shuffled = [...filtered].sort(() => Math.random() - 0.5);
    const exerciseSubset = shuffled.slice(0, 40);
    const exerciseNames = exerciseSubset.map(e => e.name);
    const exerciseList = exerciseNames.join(', ');

    const equipmentDescriptions: Record<string, string> = {
      no_equipment: 'No equipment - bodyweight exercises only',
      minimal: 'Minimal equipment - dumbbells, resistance bands, and/or kettlebells',
      home_gym: 'Home gym - bench, barbell, dumbbells, pull-up bar, weight plates',
      full_gym: 'Full gym access - all machines, cables, free weights, benches, cardio equipment',
    };

    const equipmentContext = equipmentDescriptions[equipment] || equipmentDescriptions.no_equipment;

    const prompt = `Generate a personalized workout plan with the following details:
- Goal: ${goalType || 'general fitness'}
- Fitness Level: ${fitnessLevel || 'intermediate'}
- Gender: ${gender || 'unspecified'}
- Focus Area: ${focusArea || 'full body'}
- Equipment Available: ${equipmentContext}

CRITICAL RULE — YOU MUST ONLY USE EXERCISES FROM THIS APPROVED LIST:
${exerciseList}

Do NOT invent new exercise names or variations. Use the EXACT name as written above.

ADDITIONAL RULES:
- Only include exercises that can be performed with the available equipment.
${equipment === 'no_equipment' ? '- ALL exercises must be bodyweight-only with zero equipment needed.' : ''}
- Vary exercise selection, order, and combinations each time.
- Mix compound and isolation movements.

Return a JSON object with this exact structure:
{
  "name": "Workout name (creative, descriptive)",
  "duration": "Duration in minutes (e.g., '45 min')",
  "calories": "Estimated calories burned (e.g., '300-400')",
  "exercises": [
    {
      "name": "Exercise name (MUST match approved list exactly)",
      "sets": 3,
      "reps": "12",
      "rest": "60 sec",
      "description": "Clear step-by-step instructions on how to perform this exercise with proper form",
      "targetMuscles": ["Primary muscle", "Secondary muscle"],
      "tips": ["Important form tip", "Common mistake to avoid"]
    }
  ]
}

Include 5-7 exercises. For each exercise, provide detailed descriptions, target muscles, and 2-3 helpful tips.`;

    console.log('Generating workout for:', { goalType, fitnessLevel, focusArea, equipment, exercisePoolSize: filtered.length });

    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        temperature: 0.9,
        messages: [
          { 
            role: 'system', 
            content: `You are an expert fitness trainer. Generate workout plans in valid JSON format only — no markdown, no explanations, just the JSON object.

CRITICAL: You may ONLY use exercises from the approved list provided by the user. Do NOT create exercises outside that list. Use the exact exercise name spelling from the list.

Create unique, varied combinations each time. Never generate the same workout twice.` 
          },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add credits to continue.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) throw new Error('No content in AI response');

    console.log('AI response received');

    let workout;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        workout = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse workout JSON:', parseError);
      // Fallback with exercises from the DB pool
      const fallbackNames = exerciseNames.slice(0, 5);
      workout = {
        name: "Full Body Workout",
        duration: "40 min",
        calories: "300-400",
        exercises: fallbackNames.map(name => ({
          name,
          sets: 3,
          reps: "12",
          rest: "60 sec",
          description: "Perform with controlled form.",
          targetMuscles: ["Full Body"],
          tips: ["Focus on form", "Breathe steadily"],
        })),
      };
    }

    // Attach demo URLs from the exercise library
    const exerciseLookup = new Map(
      allExercises.map(e => [e.name.toLowerCase(), e.external_video_url])
    );
    if (workout.exercises) {
      workout.exercises = workout.exercises.map((ex: any) => ({
        ...ex,
        videoUrl: exerciseLookup.get(ex.name?.toLowerCase()) || null,
      }));
    }

    return new Response(JSON.stringify({ workout }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating workout:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
