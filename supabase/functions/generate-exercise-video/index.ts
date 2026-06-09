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

    const { exerciseName, description, targetMuscles, equipment, trainerReferenceUrl, referenceVideoUrl, athleteGender = 'male' } = await req.json();

    if (!exerciseName) {
      return new Response(
        JSON.stringify({ error: "Exercise name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Generating video for exercise:", exerciseName, "with athlete gender:", athleteGender);

    // Normalize exercise name for cache key
    const normalizedName = exerciseName.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const cacheKey = `exercise-videos/${normalizedName}.mp4`;

    // Check exercises table for cached video first
    const { data: exerciseRecord } = await supabase
      .from("exercises")
      .select("id, name, description, target_muscles, equipment, video_url, video_status, reference_video_url")
      .eq("name", exerciseName)
      .single();

    if (exerciseRecord?.video_url && exerciseRecord.video_status === "completed") {
      console.log("Returning cached video from exercises table for:", exerciseName);
      return new Response(
        JSON.stringify({ videoUrl: exerciseRecord.video_url, cached: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check storage for cached video (fallback)
    const { data: existingFile } = await supabase.storage
      .from("user-photos")
      .list("exercise-videos", {
        search: normalizedName,
      });

    if (existingFile && existingFile.length > 0) {
      const matchingFile = existingFile.find(f => f.name.includes(normalizedName));
      if (matchingFile) {
        const { data: publicUrl } = supabase.storage
          .from("user-photos")
          .getPublicUrl(`exercise-videos/${matchingFile.name}`);
        
        console.log("Returning cached video from storage for:", exerciseName);
        
        // Update exercises table if record exists
        if (exerciseRecord) {
          await supabase
            .from("exercises")
            .update({ video_url: publicUrl.publicUrl, video_status: "completed" })
            .eq("name", exerciseName);
        }
        
        return new Response(
          JSON.stringify({ videoUrl: publicUrl.publicUrl, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Update status to generating if record exists
    if (exerciseRecord) {
      await supabase
        .from("exercises")
        .update({ video_status: "generating" })
        .eq("name", exerciseName);
    }

    // Build prompt using the working format
    const prompt = buildPrompt(
      exerciseName,
      description || exerciseRecord?.description || "",
      equipment || exerciseRecord?.equipment || "bodyweight",
      athleteGender
    );

    console.log("Video prompt:", prompt);

    const Replicate = (await import("https://esm.sh/replicate@0.25.2")).default;
    const replicate = new Replicate({ auth: REPLICATE_API_KEY });

    // Determine the reference video URL (prefer passed param, fallback to database record)
    const effectiveReferenceVideoUrl = referenceVideoUrl || exerciseRecord?.reference_video_url;

    let output: unknown;

    // Use Kling v2.6 Motion Control if reference video is available
    if (effectiveReferenceVideoUrl && trainerReferenceUrl) {
      console.log("Starting video generation with Kling v2.6 Motion Control...");
      console.log("Using trainer reference image:", trainerReferenceUrl);
      console.log("Using reference video for motion:", effectiveReferenceVideoUrl);

      output = await replicate.run("kwaivgi/kling-v2.6-motion-control", {
        input: {
          mode: "pro",
          image: trainerReferenceUrl,
          video: effectiveReferenceVideoUrl,
          prompt: `${athleteGender === 'female' ? 'Female' : 'Male'} athlete performing ${exerciseName} with perfect form. White background. Mono tone athletic outfit.`,
          keep_original_sound: false,
          character_orientation: "video",
        },
      });
    } else if (effectiveReferenceVideoUrl) {
      // Reference video but no trainer image - use Kling with video motion
      console.log("Starting video generation with Kling v2.6 Motion Control (video only)...");
      console.log("Using reference video for motion:", effectiveReferenceVideoUrl);

      output = await replicate.run("kwaivgi/kling-v2.6-motion-control", {
        input: {
          mode: "pro",
          video: effectiveReferenceVideoUrl,
          prompt: prompt,
          keep_original_sound: false,
        },
      });
    } else {
      // Use Kling v2.1-master for text-to-video (your working model)
      console.log("Starting video generation with Kling v2.1-master...");

      output = await replicate.run("kwaivgi/kling-v2.1-master", {
        input: {
          prompt: prompt,
        },
      });
    }

    console.log("Video generation complete:", output);

    // Kling returns a file URL directly
    const videoUrl = output as string;
    console.log("Video generated:", videoUrl);

    // Download and cache the video
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      throw new Error("Failed to download generated video");
    }

    const videoBlob = await videoResponse.blob();
    const videoBuffer = await videoBlob.arrayBuffer();

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("user-photos")
      .upload(cacheKey, new Uint8Array(videoBuffer), {
        contentType: "video/mp4",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      // Update status to failed if record exists
      if (exerciseRecord) {
        await supabase
          .from("exercises")
          .update({ video_status: "failed" })
          .eq("name", exerciseName);
      }
      // Return Replicate URL if upload fails
      return new Response(
        JSON.stringify({ videoUrl: videoUrl, cached: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("user-photos")
      .getPublicUrl(cacheKey);

    console.log("Video cached at:", publicUrl.publicUrl);

    // Update exercises table with video URL
    if (exerciseRecord) {
      await supabase
        .from("exercises")
        .update({ 
          video_url: publicUrl.publicUrl, 
          video_status: "completed" 
        })
        .eq("name", exerciseName);
    } else {
      // Insert new exercise record if it doesn't exist
      await supabase
        .from("exercises")
        .insert({
          name: exerciseName,
          description: description,
          target_muscles: targetMuscles,
          equipment: equipment || "bodyweight",
          video_url: publicUrl.publicUrl,
          video_status: "completed"
        });
    }

    return new Response(
      JSON.stringify({ videoUrl: publicUrl.publicUrl, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in generate-exercise-video:", error);
    const message = error instanceof Error ? error.message : "Failed to generate video";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
