import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Prompt template matching your working playground format
const buildPrompt = (
  exerciseName: string,
  description: string,
  equipment: string,
  athleteGender: 'male' | 'female' = 'male'
): string => {
  const equipmentText = equipment && equipment !== "bodyweight" 
    ? `with the ${equipment}` 
    : "";
  
  return `Animate a ${athleteGender} athlete performing an exercise movement with a white background and they are wearing a mono tone athletic outfit the athlete will be performing the exercise move ${equipmentText} listed in the following instructional paragraph: ${exerciseName}. ${description || ''}`;
};

interface Exercise {
  id: string;
  name: string;
  description: string | null;
  target_muscles: string[] | null;
  equipment: string | null;
  video_status: string;
  reference_video_url: string | null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY is not configured");
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { 
      limit = 1, 
      trainerReferenceUrl,
      exerciseIds,
      status = "pending",
      athleteGender = 'male'
    } = await req.json();

    console.log(`Starting batch video generation. Limit: ${limit}, Status filter: ${status}, Athlete gender: ${athleteGender}`);

    // Build query for exercises to process
    let query = supabase
      .from("exercises")
      .select("id, name, description, target_muscles, equipment, video_status, reference_video_url");

    if (exerciseIds && exerciseIds.length > 0) {
      // Process specific exercises
      query = query.in("id", exerciseIds);
    } else {
      // Process by status
      query = query.eq("video_status", status);
    }
    
    query = query.limit(limit);

    const { data: exercises, error: fetchError } = await query;

    if (fetchError) {
      throw new Error(`Failed to fetch exercises: ${fetchError.message}`);
    }

    if (!exercises || exercises.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No exercises to process", 
          processed: 0,
          results: [] 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${exercises.length} exercises to process`);

    const Replicate = (await import("https://esm.sh/replicate@0.25.2")).default;
    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    const results: Array<{
      exerciseId: string;
      exerciseName: string;
      status: string;
      videoUrl?: string;
      error?: string;
    }> = [];

    // Process exercises one at a time to respect rate limits
    for (const exercise of exercises as Exercise[]) {
      console.log(`Processing: ${exercise.name}`);

      try {
        // Update status to generating
        await supabase
          .from("exercises")
          .update({ video_status: "generating" })
          .eq("id", exercise.id);

        // Build prompt using the working format
        const prompt = buildPrompt(
          exercise.name,
          exercise.description || "",
          exercise.equipment || "bodyweight",
          athleteGender
        );

        console.log(`Prompt for ${exercise.name}:`, prompt.substring(0, 100) + "...");

        let output: unknown;

        // Use Kling v2.6 Motion Control if reference video is available
        if (exercise.reference_video_url && trainerReferenceUrl) {
          console.log(`Using Kling v2.6 Motion Control for ${exercise.name}`);
          console.log("Trainer reference:", trainerReferenceUrl);
          console.log("Reference video:", exercise.reference_video_url);

          output = await replicate.run("kwaivgi/kling-v2.6-motion-control", {
            input: {
              mode: "pro",
              image: trainerReferenceUrl,
              video: exercise.reference_video_url,
              prompt: `${athleteGender === 'female' ? 'Female' : 'Male'} athlete performing ${exercise.name} with perfect form. White background. Mono tone athletic outfit.`,
              keep_original_sound: false,
              character_orientation: "video",
            },
          });
        } else if (exercise.reference_video_url) {
          // Reference video but no trainer image
          console.log(`Using Kling v2.6 Motion Control (video only) for ${exercise.name}`);

          output = await replicate.run("kwaivgi/kling-v2.6-motion-control", {
            input: {
              mode: "pro",
              video: exercise.reference_video_url,
              prompt: prompt,
              keep_original_sound: false,
            },
          });
        } else {
          // Use Kling v2.1-master for text-to-video (your working model)
          console.log(`Using Kling v2.1-master for ${exercise.name}`);

          output = await replicate.run("kwaivgi/kling-v2.1-master", {
            input: {
              prompt: prompt,
            },
          });
        }

        const videoUrl = output as string;
        console.log(`Video generated for ${exercise.name}:`, videoUrl);

        // Download video
        const videoResponse = await fetch(videoUrl);
        if (!videoResponse.ok) {
          throw new Error("Failed to download generated video");
        }

        const videoBlob = await videoResponse.blob();
        const videoBuffer = await videoBlob.arrayBuffer();

        // Upload to storage
        const normalizedName = exercise.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
        const cacheKey = `exercise-videos/${normalizedName}.mp4`;

        const { error: uploadError } = await supabase.storage
          .from("user-photos")
          .upload(cacheKey, new Uint8Array(videoBuffer), {
            contentType: "video/mp4",
            upsert: true,
          });

        if (uploadError) {
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        // Get public URL
        const { data: publicUrl } = supabase.storage
          .from("user-photos")
          .getPublicUrl(cacheKey);

        // Update exercise record
        await supabase
          .from("exercises")
          .update({ 
            video_url: publicUrl.publicUrl, 
            video_status: "completed" 
          })
          .eq("id", exercise.id);

        results.push({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          status: "completed",
          videoUrl: publicUrl.publicUrl
        });

        console.log(`✓ Completed: ${exercise.name}`);

        // Add delay between generations to respect rate limits (5 seconds)
        if (exercises.indexOf(exercise) < exercises.length - 1) {
          console.log("Waiting 5 seconds before next generation...");
          await new Promise(resolve => setTimeout(resolve, 5000));
        }

      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`✗ Failed: ${exercise.name}:`, errorMessage);

        // Update status to failed
        await supabase
          .from("exercises")
          .update({ video_status: "failed" })
          .eq("id", exercise.id);

        results.push({
          exerciseId: exercise.id,
          exerciseName: exercise.name,
          status: "failed",
          error: errorMessage
        });
      }
    }

    // Summary
    const completed = results.filter(r => r.status === "completed").length;
    const failed = results.filter(r => r.status === "failed").length;

    console.log(`Batch complete. Completed: ${completed}, Failed: ${failed}`);

    // Get remaining pending count
    const { count: remainingCount } = await supabase
      .from("exercises")
      .select("id", { count: "exact", head: true })
      .eq("video_status", "pending");

    return new Response(
      JSON.stringify({ 
        message: `Processed ${results.length} exercises`,
        processed: results.length,
        completed,
        failed,
        remainingPending: remainingCount || 0,
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in batch-generate-exercise-videos:", error);
    const message = error instanceof Error ? error.message : "Failed to process batch";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
