import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!RAPIDAPI_KEY) throw new Error("RAPIDAPI_KEY not configured");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { mode = "update-proxy-urls", limit = 100, offset = 0 } = await req.json().catch(() => ({}));

    if (mode === "update-proxy-urls") {
      // Find exercises still using proxy URLs
      const { data: proxyExercises, error: fetchErr } = await supabase
        .from("exercises")
        .select("id, name, external_video_url")
        .or("external_video_url.like.%exercise-image%,external_video_url.like.%functions/v1%")
        .range(offset, offset + limit - 1);

      if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`);
      if (!proxyExercises || proxyExercises.length === 0) {
        return new Response(JSON.stringify({ updated: 0, remaining: 0, message: "All proxy URLs already updated" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Fetch exercises from ExerciseDB to get direct GIF URLs
      // We'll search by name to find matches
      let totalUpdated = 0;
      let totalFailed = 0;
      const batchSize = 50;

      // Fetch a large batch from ExerciseDB
      for (let apiOffset = 0; apiOffset < 1500; apiOffset += batchSize) {
        const apiUrl = `https://exercisedb.p.rapidapi.com/exercises?limit=${batchSize}&offset=${apiOffset}`;
        const response = await fetch(apiUrl, {
          headers: {
            "X-RapidAPI-Key": RAPIDAPI_KEY,
            "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
          },
        });

        if (!response.ok) {
          if (response.status === 429) {
            return new Response(JSON.stringify({ 
              updated: totalUpdated, failed: totalFailed, 
              remaining: proxyExercises.length - totalUpdated,
              quotaExceeded: true, message: "API quota hit, run again later" 
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }
          continue;
        }

        const apiExercises = await response.json();
        if (!Array.isArray(apiExercises) || apiExercises.length === 0) break;

        // Build a map of name -> gifUrl
        const gifMap = new Map<string, string>();
        for (const ex of apiExercises) {
          if (ex.name && ex.gifUrl) {
            gifMap.set(ex.name.toLowerCase(), ex.gifUrl);
          }
        }

        // Update matching exercises
        for (const exercise of proxyExercises) {
          const nameLower = exercise.name.toLowerCase();
          const gifUrl = gifMap.get(nameLower);
          if (gifUrl) {
            const { error: updateErr } = await supabase
              .from("exercises")
              .update({ external_video_url: gifUrl, video_source: "exercisedb" })
              .eq("id", exercise.id);

            if (!updateErr) {
              totalUpdated++;
              // Remove from list so we don't re-check
              const idx = proxyExercises.indexOf(exercise);
              if (idx > -1) proxyExercises.splice(idx, 1);
            } else {
              totalFailed++;
            }
          }
        }

        // If all proxy exercises are updated, stop
        if (proxyExercises.length === 0) break;

        // Small delay between API calls
        await new Promise(r => setTimeout(r, 200));
      }

      // Count remaining proxy URLs
      const { count } = await supabase
        .from("exercises")
        .select("id", { count: "exact", head: true })
        .or("external_video_url.like.%exercise-image%,external_video_url.like.%functions/v1%");

      return new Response(JSON.stringify({ 
        updated: totalUpdated, failed: totalFailed, 
        remaining: count || 0 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

    } else if (mode === "fill-missing") {
      // Find exercises with no demo at all
      const { data: missingExercises, error: fetchErr } = await supabase
        .from("exercises")
        .select("id, name")
        .is("external_video_url", null);

      if (fetchErr) throw new Error(`Fetch error: ${fetchErr.message}`);
      if (!missingExercises || missingExercises.length === 0) {
        return new Response(JSON.stringify({ matched: 0, remaining: 0, message: "No missing exercises" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Search ExerciseDB by name for each missing exercise
      let matched = 0;
      for (const exercise of missingExercises) {
        // Try searching by name
        const searchName = exercise.name
          .toLowerCase()
          .replace(/[^a-z0-9 ]/g, '')
          .split(' ')
          .filter((w: string) => w.length > 2)
          .slice(0, 3)
          .join(' ');

        const searchUrl = `https://exercisedb.p.rapidapi.com/exercises/name/${encodeURIComponent(searchName)}?limit=5`;
        
        try {
          const response = await fetch(searchUrl, {
            headers: {
              "X-RapidAPI-Key": RAPIDAPI_KEY,
              "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
            },
          });

          if (response.status === 429) {
            return new Response(JSON.stringify({ 
              matched, remaining: missingExercises.length - matched, quotaExceeded: true 
            }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
          }

          if (response.ok) {
            const results = await response.json();
            if (Array.isArray(results) && results.length > 0 && results[0].gifUrl) {
              await supabase
                .from("exercises")
                .update({ external_video_url: results[0].gifUrl, video_source: "exercisedb" })
                .eq("id", exercise.id);
              matched++;
              console.log(`Matched "${exercise.name}" → "${results[0].name}"`);
            }
          }

          await new Promise(r => setTimeout(r, 300));
        } catch (e) {
          console.error(`Search failed for "${exercise.name}":`, e);
        }
      }

      return new Response(JSON.stringify({ 
        matched, total_missing: missingExercises.length, 
        remaining: missingExercises.length - matched 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), 
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Failed";
    return new Response(JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
