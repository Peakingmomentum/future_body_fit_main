import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as base64Decode } from "https://deno.land/std@0.168.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { imageUrl, base64Data, fileName, trainerId } = await req.json();

    let imageBuffer: Uint8Array;
    let contentType = "image/png";

    if (base64Data) {
      // Handle base64 encoded image
      console.log("Processing base64 image data for:", fileName || "trainer");
      
      // Remove data URL prefix if present
      const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, "");
      imageBuffer = base64Decode(base64Clean);
      
      // Detect content type from data URL if present
      const dataUrlMatch = base64Data.match(/^data:image\/(\w+);base64,/);
      if (dataUrlMatch) {
        contentType = `image/${dataUrlMatch[1]}`;
      }
    } else if (imageUrl) {
      // Handle URL-based image
      console.log("Downloading trainer reference from:", imageUrl);

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.status}`);
      }

      const imageBlob = await imageResponse.blob();
      const buffer = await imageBlob.arrayBuffer();
      imageBuffer = new Uint8Array(buffer);
      contentType = imageResponse.headers.get("content-type") || "image/png";
    } else {
      return new Response(
        JSON.stringify({ error: "Either imageUrl or base64Data is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine file extension
    let ext = "png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) ext = "jpg";
    else if (contentType.includes("webp")) ext = "webp";

    const trainerName = trainerId || fileName || "trainer";
    const storagePath = `trainer-references/${trainerName}.${ext}`;

    console.log("Uploading to storage:", storagePath);

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from("user-photos")
      .upload(storagePath, imageBuffer, {
        contentType: contentType,
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from("user-photos")
      .getPublicUrl(storagePath);

    console.log("Trainer reference uploaded:", publicUrl.publicUrl);

    return new Response(
      JSON.stringify({ 
        success: true,
        trainerReferenceUrl: publicUrl.publicUrl,
        trainerId: trainerName,
        message: `Trainer reference '${trainerName}' uploaded successfully`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error uploading trainer reference:", error);
    const message = error instanceof Error ? error.message : "Failed to upload";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
