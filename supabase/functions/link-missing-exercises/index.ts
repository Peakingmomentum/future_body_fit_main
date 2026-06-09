import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Mapping: missing exercise name (lowercased) -> matching exercise name to look up
const NAME_MAPPINGS: Record<string, string[]> = {
  "barbell back squats": ["barbell full squat"],
  "box jumps": ["box jump down with one leg stabilization", "depth jump to box jump"],
  "burpees": ["burpee"],
  "chin-ups": ["chin-up"],
  "dumbbell incline chest press": ["dumbbell incline bench press"],
  "dumbbell overhead press": ["dumbbell shoulder press", "dumbbell seated shoulder press"],
  "dumbbell rows": ["dumbbell bent over row"],
  "handstand push-ups": ["handstand push-up"],
  "l-sit holds": ["l-sit on floor"],
  "leg extensions": ["lever leg extension"],
  "lunges": ["forward lunge (male)", "dumbbell lunge", "barbell lunge"],
  "mountain climbers": ["mountain climber"],
  "seated cable row": ["cable seated row"],
  "single-arm kettlebell/dumbbell rdl": ["dumbbell single leg deadlift"],
  "single-leg elevated hip thrust": ["hip thrusts", "barbell hip thrust"],
  "skull crushers": ["barbell lying triceps extension skull crusher"],
  "squats": ["barbell full squat", "bodyweight squat"],
  "step-ups": ["dumbbell step-up", "barbell step-up"],
  "tricep pushdowns": ["cable pushdown"],
  "crunches": ["crunch"],
};

// Exercises that need ExerciseDB API lookup
const NEEDS_API_LOOKUP = ["bird dog", "cable crossover", "face pulls", "jumping jacks", "superman to hollow body roll"];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const results: { exercise: string; action: string; success: boolean; details?: string }[] = [];

    // Step 1: Get all exercises with missing demos
    const { data: allExercises, error: fetchErr } = await supabase
      .from('exercises')
      .select('id, name, external_video_url')
      .order('name');

    if (fetchErr) throw fetchErr;

    const exercisesByName = new Map<string, typeof allExercises[0]>();
    for (const ex of allExercises) {
      exercisesByName.set(ex.name.toLowerCase(), ex);
    }

    // Step 2: Link exercises with known mappings
    const missingExercises = allExercises.filter(e => !e.external_video_url);

    for (const missing of missingExercises) {
      const key = missing.name.toLowerCase();
      const candidates = NAME_MAPPINGS[key];

      if (!candidates) continue;

      let linked = false;
      for (const candidateName of candidates) {
        const match = exercisesByName.get(candidateName.toLowerCase());
        if (match?.external_video_url) {
          const { error: updateErr } = await supabase
            .from('exercises')
            .update({ external_video_url: match.external_video_url })
            .eq('id', missing.id);

          if (updateErr) {
            results.push({ exercise: missing.name, action: 'link', success: false, details: updateErr.message });
          } else {
            results.push({ exercise: missing.name, action: 'linked', success: true, details: `From: ${match.name}` });
            linked = true;
          }
          break;
        }
      }

      if (!linked && candidates.length > 0) {
        // Check if the candidate itself has a proxy URL we can note
        const match = exercisesByName.get(candidates[0].toLowerCase());
        if (match && !match.external_video_url) {
          results.push({ exercise: missing.name, action: 'skip', success: false, details: `Match "${match.name}" also has no demo` });
        } else if (match?.external_video_url) {
          // Already handled above
        } else {
          results.push({ exercise: missing.name, action: 'skip', success: false, details: `Match "${candidates[0]}" not found in DB` });
        }
      }
    }

    // Step 3: Try ExerciseDB API for unmatched exercises
    const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
    const unmatchedMissing = missingExercises.filter(e => {
      const key = e.name.toLowerCase();
      return NEEDS_API_LOOKUP.includes(key) || (!NAME_MAPPINGS[key] && !results.find(r => r.exercise === e.name));
    });

    if (RAPIDAPI_KEY && unmatchedMissing.length > 0) {
      for (const exercise of unmatchedMissing) {
        try {
          const searchName = exercise.name.toLowerCase().replace(/[^a-z ]/g, '').trim();
          const apiUrl = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(searchName)}?offset=0&limit=3`;

          const apiRes = await fetch(apiUrl, {
            headers: {
              'X-RapidAPI-Key': RAPIDAPI_KEY,
              'X-RapidAPI-Host': 'exercisedb.p.rapidapi.com',
            },
          });

          if (apiRes.status === 429) {
            results.push({ exercise: exercise.name, action: 'api_lookup', success: false, details: 'Rate limited' });
            break;
          }

          if (!apiRes.ok) {
            results.push({ exercise: exercise.name, action: 'api_lookup', success: false, details: `API ${apiRes.status}` });
            continue;
          }

          const apiData = await apiRes.json();
          if (apiData && apiData.length > 0 && apiData[0].gifUrl) {
            const gifUrl = apiData[0].gifUrl;

            // Download and cache the GIF
            const gifRes = await fetch(gifUrl);
            if (!gifRes.ok) {
              results.push({ exercise: exercise.name, action: 'api_lookup', success: false, details: 'GIF download failed' });
              continue;
            }

            const gifData = await gifRes.arrayBuffer();
            const fileName = `${exercise.id}.gif`;

            const { error: uploadErr } = await supabase.storage
              .from('exercise-gifs')
              .upload(fileName, gifData, { contentType: 'image/gif', upsert: true });

            if (uploadErr) {
              results.push({ exercise: exercise.name, action: 'api_lookup', success: false, details: uploadErr.message });
              continue;
            }

            const { data: publicUrlData } = supabase.storage
              .from('exercise-gifs')
              .getPublicUrl(fileName);

            const { error: updateErr } = await supabase
              .from('exercises')
              .update({ external_video_url: publicUrlData.publicUrl })
              .eq('id', exercise.id);

            if (updateErr) {
              results.push({ exercise: exercise.name, action: 'api_lookup', success: false, details: updateErr.message });
            } else {
              results.push({ exercise: exercise.name, action: 'api_cached', success: true, details: `From ExerciseDB: ${apiData[0].name}` });
            }
          } else {
            results.push({ exercise: exercise.name, action: 'api_lookup', success: false, details: 'No results from ExerciseDB' });
          }

          await new Promise(r => setTimeout(r, 500));
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown';
          results.push({ exercise: exercise.name, action: 'api_lookup', success: false, details: msg });
        }
      }
    } else if (unmatchedMissing.length > 0 && !RAPIDAPI_KEY) {
      for (const ex of unmatchedMissing) {
        results.push({ exercise: ex.name, action: 'skip', success: false, details: 'No RAPIDAPI_KEY for API lookup' });
      }
    }

    const linked = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      message: `Linked ${linked} exercises, ${failed} could not be resolved`,
      linked,
      failed,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Link missing exercises error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
