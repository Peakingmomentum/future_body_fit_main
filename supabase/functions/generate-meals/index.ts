import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MealRequest {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  goalType: string;
  dietPreference?: string;
  regenerateMealType?: string; // If provided, only regenerate this meal type
}

interface Meal {
  type: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  ingredients: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { dailyCalories, proteinGrams, carbsGrams, fatsGrams, goalType, dietPreference, regenerateMealType } = await req.json() as MealRequest;

    console.log('Generating meals for:', { dailyCalories, proteinGrams, carbsGrams, fatsGrams, goalType, dietPreference, regenerateMealType });

    const AI_GATEWAY_API_KEY = Deno.env.get('AI_GATEWAY_API_KEY');
    if (!AI_GATEWAY_API_KEY) {
      throw new Error('AI_GATEWAY_API_KEY is not configured');
    }

    const dietInfo = dietPreference ? `The user follows a ${dietPreference} diet.` : '';
    const goalInfo = goalType === 'weight_loss' ? 'focused on weight loss with high protein and lower carbs' :
                     goalType === 'muscle_gain' ? 'focused on muscle building with higher protein and calories' :
                     'balanced for general fitness';

    // Calculate portion for single meal regeneration
    const mealPortions: Record<string, number> = {
      breakfast: 0.25,
      lunch: 0.30,
      dinner: 0.35,
      snack: 0.10,
    };

    let prompt: string;

    if (regenerateMealType) {
      // Single meal regeneration
      const portion = mealPortions[regenerateMealType] || 0.25;
      const mealCalories = Math.round(dailyCalories * portion);
      const mealProtein = Math.round(proteinGrams * portion);
      const mealCarbs = Math.round(carbsGrams * portion);
      const mealFat = Math.round(fatsGrams * portion);

      prompt = `Generate a single ${regenerateMealType} meal that is DIFFERENT and CREATIVE.

Target macros for this ${regenerateMealType}:
- Calories: ~${mealCalories}
- Protein: ~${mealProtein}g
- Carbs: ~${mealCarbs}g
- Fat: ~${mealFat}g

The meal should be ${goalInfo}. ${dietInfo}

Return ONLY a valid JSON array with exactly 1 meal object. The meal must have these exact fields:
- type: "${regenerateMealType}"
- name: string (creative meal name)
- calories: number
- protein: number (grams)
- carbs: number (grams)
- fat: number (grams)
- ingredients: string[] (list of main ingredients)

Example format:
[{"type": "${regenerateMealType}", "name": "Unique Meal Name", "calories": ${mealCalories}, "protein": ${mealProtein}, "carbs": ${mealCarbs}, "fat": ${mealFat}, "ingredients": ["ingredient1", "ingredient2"]}]`;
    } else {
      // Full day meal plan
      prompt = `Generate a full day meal plan with exactly 4 meals: breakfast, lunch, dinner, and snack.

Target macros for the day:
- Total Calories: ${dailyCalories}
- Protein: ${proteinGrams}g
- Carbs: ${carbsGrams}g
- Fat: ${fatsGrams}g

The meals should be ${goalInfo}. ${dietInfo}

Distribute the macros appropriately across the 4 meals (breakfast ~25%, lunch ~30%, dinner ~35%, snack ~10%).

Return ONLY a valid JSON array with exactly 4 meal objects. Each meal must have these exact fields:
- type: "breakfast" | "lunch" | "dinner" | "snack"
- name: string (meal name)
- calories: number
- protein: number (grams)
- carbs: number (grams)
- fat: number (grams)
- ingredients: string[] (list of main ingredients)

Example format:
[
  {"type": "breakfast", "name": "Protein Oatmeal", "calories": 450, "protein": 30, "carbs": 55, "fat": 12, "ingredients": ["oats", "protein powder", "banana", "almond butter"]},
  ...
]`;
    }

    const response = await fetch('https://ai-gateway.vercel.sh/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_GATEWAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: 'You are a professional nutritionist. You only respond with valid JSON arrays, no markdown or explanation.' },
          { role: 'user', content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits depleted. Please add more credits.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response content:', content);

    // Parse the JSON response, handling markdown code blocks
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    const meals: Meal[] = JSON.parse(cleanContent);

    console.log('Generated meals:', meals);

    return new Response(JSON.stringify({ meals }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating meals:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate meals';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
