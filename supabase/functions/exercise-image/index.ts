import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const exerciseId = url.searchParams.get("id");

    if (!exerciseId) {
      return new Response("Missing exercise id", { status: 400, headers: corsHeaders });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Check if already cached in storage
    const fileName = `${exerciseId}.gif`;
    const { data: existingFile } = await supabase.storage
      .from("exercise-gifs")
      .createSignedUrl(fileName, 60);

    if (existingFile?.signedUrl) {
      // Already cached — redirect to public URL
      const { data: publicUrlData } = supabase.storage
        .from("exercise-gifs")
        .getPublicUrl(fileName);

      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          Location: publicUrlData.publicUrl,
          "Cache-Control": "public, max-age=31536000",
        },
      });
    }

    // 2. Not cached — fetch from ExerciseDB
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    if (!RAPIDAPI_KEY) {
      return new Response("API key not configured", { status: 500, headers: corsHeaders });
    }

    const imageUrl = `https://exercisedb.p.rapidapi.com/image?exerciseId=${exerciseId}&resolution=360`;
    const response = await fetch(imageUrl, {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      console.error(`ExerciseDB image error ${response.status} for id ${exerciseId}`);
      return new Response("Exercise image not available", {
        status: response.status === 429 ? 429 : 404,
        headers: corsHeaders,
      });
    }

    const imageData = await response.arrayBuffer();

    // 3. Cache to storage (fire and forget — don't block response)
    supabase.storage
      .from("exercise-gifs")
      .upload(fileName, imageData, { contentType: "image/gif", upsert: true })
      .then(({ error }) => {
        if (error) {
          console.error(`Failed to cache ${exerciseId}:`, error.message);
          return;
        }
        // Update the exercise record to point to storage URL
        const { data: publicUrlData } = supabase.storage
          .from("exercise-gifs")
          .getPublicUrl(fileName);

        supabase
          .from("exercises")
          .update({ external_video_url: publicUrlData.publicUrl })
          .like("external_video_url", `%exercise-image%id=${exerciseId}%`)
          .then(({ error: updateErr }) => {
            if (updateErr) console.error(`Failed to update DB for ${exerciseId}:`, updateErr.message);
            else console.log(`Cached and updated: ${exerciseId}`);
          });
      });

    // 4. Return the image immediately
    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/gif",
        "Cache-Control": "public, max-age=604800",
      },
    });
  } catch (error) {
    console.error("Error proxying exercise image:", error);
    return new Response("Failed to fetch image", { status: 500, headers: corsHeaders });
  }
});
