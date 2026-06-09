import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Normalize exercise names for matching
const normalize = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

// Map our equipment names to ExerciseDB equipment prefixes
const equipmentMap: Record<string, string> = {
  dumbbells: "dumbbell",
  dumbbell: "dumbbell",
  barbell: "barbell",
  kettlebell: "kettlebell",
  "kettlebell/dumbbell": "dumbbell",
  cables: "cable",
  cable: "cable",
  machine: "lever",
  bodyweight: "body weight",
  "body weight": "body weight",
  "pull-up bar": "body weight",
  box: "body weight",
  band: "band",
  "resistance band": "band",
};

// Fuzzy match score (word overlap)
const matchScore = (a: string, b: string): number => {
  const wordsA = normalize(a).split(/\s+/);
  const wordsB = normalize(b).split(/\s+/);
  const intersection = wordsA.filter(w => wordsB.includes(w));
  return intersection.length / Math.max(wordsA.length, wordsB.length);
};

// Build multiple search queries from an exercise name + equipment
function buildSearchQueries(name: string, equipment: string | null): string[] {
  const queries: string[] = [];
  
  let cleaned = normalize(name)
    // Expand common abbreviations
    .replace(/\bdb\b/g, "dumbbell")
    .replace(/\bkb\b/g, "kettlebell")
    .replace(/\bbb\b/g, "barbell")
    .replace(/\brdl\b/g, "deadlift")
    // Remove parenthetical info
    .replace(/\(.*?\)/g, "")
    // Remove "with" clauses that ExerciseDB won't have
    .replace(/\bwith\s+\w+/g, "")
    // Singularize common plurals
    .replace(/\bcurls\b/g, "curl")
    .replace(/\bsquats\b/g, "squat")
    .replace(/\braises\b/g, "raise")
    .replace(/\brows\b/g, "row")
    .replace(/\bpresses\b/g, "press")
    .replace(/\bflyes\b/g, "fly")
    .replace(/\bdips\b/g, "dip")
    .replace(/\blunges\b/g, "lunge")
    .replace(/\bbridges\b/g, "bridge")
    .replace(/\bjumps\b/g, "jump")
    .replace(/\bswings\b/g, "swing")
    .replace(/\bholds\b/g, "hold")
    .replace(/\bcrunches\b/g, "crunch")
    .replace(/\bups\b/g, "up")
    .trim()
    .replace(/\s+/g, " ");

  // Get the ExerciseDB equipment prefix
  const eqKey = (equipment || "").toLowerCase().trim();
  const eqPrefix = equipmentMap[eqKey] || "";

  // Check if the name already starts with an equipment word
  const nameHasEquipment = ["dumbbell", "barbell", "kettlebell", "cable", "lever", "band", "smith"]
    .some(eq => cleaned.startsWith(eq));

  // Strategy 1: Equipment prefix + full cleaned name (if name doesn't already have equipment)
  if (eqPrefix && !nameHasEquipment && eqPrefix !== "body weight") {
    queries.push(`${eqPrefix} ${cleaned}`);
  }

  // Strategy 2: Full cleaned name as-is
  queries.push(cleaned);

  // Strategy 3: Just the core exercise name (last 1-2 meaningful words)
  const words = cleaned.split(/\s+/);
  if (words.length > 2) {
    // Try last 2 words (e.g., "bench press", "arnold press")
    queries.push(words.slice(-2).join(" "));
  }

  // Strategy 4: First 3 words
  if (words.length > 3) {
    queries.push(words.slice(0, 3).join(" "));
  }

  // Deduplicate
  return [...new Set(queries)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    if (!RAPIDAPI_KEY) {
      throw new Error("RAPIDAPI_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { exerciseIds, exerciseName, limit = 10 } = await req.json();

    // Single exercise lookup
    if (exerciseName) {
      console.log("Looking up single exercise:", exerciseName);
      
      // Get the exercise's equipment from DB for better matching
      const { data: exerciseRecord } = await supabase
        .from("exercises")
        .select("equipment")
        .eq("name", exerciseName)
        .single();

      const equipment = exerciseRecord?.equipment || null;
      const gifUrl = await searchExerciseDBMulti(exerciseName, equipment, RAPIDAPI_KEY);
      
      if (gifUrl) {
        await supabase
          .from("exercises")
          .update({ external_video_url: gifUrl, video_source: "exercisedb" })
          .eq("name", exerciseName);

        return new Response(
          JSON.stringify({ found: true, gifUrl }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ found: false, message: "No matching exercise found in ExerciseDB" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Batch lookup for exercises without external videos
    let query = supabase
      .from("exercises")
      .select("id, name, equipment")
      .is("external_video_url", null)
      .or("video_source.is.null,video_source.eq.none");

    if (exerciseIds?.length > 0) {
      query = query.in("id", exerciseIds);
    }

    const { data: exercises, error } = await query.limit(limit);
    if (error) throw error;
    if (!exercises || exercises.length === 0) {
      return new Response(
        JSON.stringify({ message: "No exercises need external demos", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${exercises.length} exercises for real demos`);

    const results: Array<{ id: string; name: string; found: boolean; gifUrl?: string; searchQueries?: string[] }> = [];

    for (const exercise of exercises) {
      try {
        const gifUrl = await searchExerciseDBMulti(exercise.name, exercise.equipment, RAPIDAPI_KEY);
        
        if (gifUrl) {
          await supabase
            .from("exercises")
            .update({ external_video_url: gifUrl, video_source: "exercisedb" })
            .eq("id", exercise.id);

          results.push({ id: exercise.id, name: exercise.name, found: true, gifUrl });
          console.log(`✓ Found real demo for: ${exercise.name}`);
        } else {
          await supabase
            .from("exercises")
            .update({ video_source: "ai_only" })
            .eq("id", exercise.id);

          results.push({ id: exercise.id, name: exercise.name, found: false });
          console.log(`✗ No real demo for: ${exercise.name}`);
        }

        // Rate limit between exercises
        await new Promise(r => setTimeout(r, 350));
      } catch (err) {
        console.error(`Error processing ${exercise.name}:`, err);
        results.push({ id: exercise.id, name: exercise.name, found: false });
      }
    }

    const found = results.filter(r => r.found).length;
    return new Response(
      JSON.stringify({ processed: results.length, found, notFound: results.length - found, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in fetch-exercise-demos:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch demos";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Try multiple search strategies and return the best match
async function searchExerciseDBMulti(exerciseName: string, equipment: string | null, apiKey: string): Promise<string | null> {
  const queries = buildSearchQueries(exerciseName, equipment);
  console.log(`Search queries for "${exerciseName}" (${equipment}):`, queries);

  for (const searchTerm of queries) {
    const result = await searchExerciseDB(searchTerm, exerciseName, apiKey);
    if (result) return result;
    // Rate limit between API calls
    await new Promise(r => setTimeout(r, 250));
  }

  return null;
}

async function searchExerciseDB(searchTerm: string, originalName: string, apiKey: string): Promise<string | null> {
  const url = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(searchTerm)}?limit=15&offset=0`;
  
  const response = await fetch(url, {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
    },
  });

  if (!response.ok) {
    console.error(`ExerciseDB API error for "${searchTerm}": ${response.status}`);
    return null;
  }

  const data = await response.json();
  if (!data || !Array.isArray(data) || data.length === 0) {
    console.log(`No results for search term: "${searchTerm}"`);
    return null;
  }

  // Find best match against original name
  let bestMatch = data[0];
  let bestScore = matchScore(originalName, data[0].name);

  for (const exercise of data) {
    const score = matchScore(originalName, exercise.name);
    if (score > bestScore) {
      bestScore = score;
      bestMatch = exercise;
    }
  }

  console.log(`Best match for "${searchTerm}": "${bestMatch.name}" (score: ${bestScore.toFixed(2)})`);

  // Accept if reasonable match (>= 25% word overlap)
  if (bestScore >= 0.25 && bestMatch.id) {
    // Store the ExerciseDB image proxy URL with anon key (publishable, safe to expose)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const imageUrl = `${SUPABASE_URL}/functions/v1/exercise-image?id=${bestMatch.id}&apikey=${SUPABASE_ANON_KEY}`;
    return imageUrl;
  }

  return null;
}
