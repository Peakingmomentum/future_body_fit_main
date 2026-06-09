import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!RAPIDAPI_KEY) throw new Error("RAPIDAPI_KEY not configured");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase env not configured");

    const { offset = 0, limit = 100, updateProxyUrls = false } = await req.json().catch(() => ({}));

    console.log(`Syncing ExerciseDB batch: offset=${offset}, limit=${limit}`);

    const apiUrl = `https://exercisedb.p.rapidapi.com/exercises?limit=${limit}&offset=${offset}`;
    const response = await fetch(apiUrl, {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "ExerciseDB monthly API quota exceeded. Please wait for it to reset or upgrade your RapidAPI plan.", quotaExceeded: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`ExerciseDB API error ${response.status}: ${errorText}`);
    }

    const exercises = await response.json();
    if (!Array.isArray(exercises)) throw new Error("Unexpected API response format");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get existing exercises for dedup and update
    const { data: existing, error: fetchErr } = await supabase
      .from("exercises")
      .select("name, external_video_url");

    if (fetchErr) throw new Error(`Failed to fetch existing exercises: ${fetchErr.message}`);

    const existingMap = new Map<string, string | null>();
    for (const e of (existing || [])) {
      existingMap.set(e.name.toLowerCase(), e.external_video_url);
    }

    let inserted = 0;
    let skipped = 0;
    let updated = 0;

    for (const ex of exercises) {
      const name = ex.name;
      const gifUrl = ex.gifUrl || null;
      const nameLower = name.toLowerCase();

      if (existingMap.has(nameLower)) {
        // Check if existing record needs gifUrl update (has proxy URL or null)
        const currentUrl = existingMap.get(nameLower);
        const needsUpdate = !currentUrl || currentUrl.includes("exercise-image") || currentUrl.includes("functions/v1");
        
        if (needsUpdate && gifUrl) {
          const { error: updateErr } = await supabase
            .from("exercises")
            .update({ external_video_url: gifUrl })
            .ilike("name", nameLower);

          if (updateErr) {
            console.error(`Failed to update "${name}":`, updateErr.message);
          } else {
            updated++;
          }
        }
        skipped++;
        continue;
      }

      const targetMuscles = [ex.target, ...(ex.secondaryMuscles || [])].filter(Boolean);

      const { error: insertErr } = await supabase.from("exercises").insert({
        name,
        description: `Targets ${ex.target}. Body part: ${ex.bodyPart}.`,
        target_muscles: targetMuscles,
        equipment: ex.equipment || "bodyweight",
        external_video_url: gifUrl,
        video_source: "exercisedb",
        difficulty: "beginner",
      });

      if (insertErr) {
        console.error(`Failed to insert "${name}":`, insertErr.message);
        skipped++;
      } else {
        inserted++;
        existingMap.set(nameLower, gifUrl);
      }

      if ((inserted + updated) % 5 === 0) await sleep(100);
    }

    console.log(`Batch done: ${inserted} inserted, ${updated} updated, ${skipped} skipped, ${exercises.length} total from API`);

    return new Response(
      JSON.stringify({ inserted, updated, skipped, total: exercises.length, hasMore: exercises.length >= limit }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Sync error:", error);
    const message = error instanceof Error ? error.message : "Sync failed";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
