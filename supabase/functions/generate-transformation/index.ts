import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currentWeight, goalWeight, goalType, gender, beforePhotoUrl } = await req.json();
    const AI_GATEWAY_API_KEY = Deno.env.get("AI_GATEWAY_API_KEY");
    
    if (!AI_GATEWAY_API_KEY) {
      throw new Error("AI_GATEWAY_API_KEY is not configured");
    }

    console.log("Received request with beforePhotoUrl:", beforePhotoUrl ? "present" : "missing");

    // Calculate transformation description
    const weightDiff = (currentWeight || 180) - (goalWeight || 165);
    const isLosingWeight = weightDiff > 0;
    
    let transformationDesc = "";
    if (goalType === "weight_loss") {
      transformationDesc = "Make them leaner with visible muscle definition, reduced body fat, more toned abs and arms. Show realistic weight loss transformation.";
    } else if (goalType === "muscle_gain") {
      transformationDesc = "Make them more muscular with larger arms, broader shoulders, bigger chest, and defined abs. Show realistic muscle gain transformation.";
    } else if (goalType === "toning") {
      transformationDesc = "Make them more toned and defined with visible muscle definition, especially in arms and abs. Show realistic toning transformation.";
    } else if (goalType === "strength") {
      transformationDesc = "Make them look stronger with denser muscles, thicker arms and legs, more powerful build. Show realistic strength transformation.";
    } else {
      transformationDesc = "Make them look healthier and fitter with improved muscle definition and reduced body fat. Show realistic fitness transformation.";
    }

    // System instructions for consistent output across all generations
    const systemPrompt = `You are a fitness motivation visualization tool. Your role is to create inspiring "goal achieved" fitness images that help people visualize their health and fitness goals. This is for personal motivation and goal-setting.

GUIDELINES:
1. OUTPUT FORMAT: Always generate images in PORTRAIT orientation (3:4 aspect ratio, taller than wide).
2. IDENTITY: Keep the person recognizable - same face, skin tone, hair.
3. CLOTHING: Keep the same clothing style.
4. SETTING: Maintain similar background and lighting.
5. POSE: Preserve the same body pose. Head at top, feet at bottom.
6. REALISM: Show healthy, achievable results from diet and exercise over 8-16 weeks.
7. NO ROTATION: Never rotate or flip the image.`;

    let response;

    // If user uploaded a photo, use image editing to transform it
    if (beforePhotoUrl && beforePhotoUrl.startsWith('data:')) {
      console.log("Using image editing mode with user's photo");
      
      const userPrompt = `Create an inspiring "goal achieved" version of this fitness photo, showing the positive results of a healthy diet and exercise program. ${transformationDesc}

This is a motivational visualization showing what they can achieve with dedication.

DETAILS:
- Current weight: ${currentWeight || 180} lbs → Goal weight: ${goalWeight || 165} lbs
- Generate in PORTRAIT orientation (3:4 ratio, taller than wide)
- Keep the same person, just healthier and fitter
- Show realistic, achievable results`;

      response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: userPrompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: beforePhotoUrl,
                  },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });
    } else if (beforePhotoUrl && beforePhotoUrl.startsWith('http')) {
      // If it's a URL, fetch and convert to base64 first
      console.log("Fetching image from URL:", beforePhotoUrl);
      
      try {
        const imageResponse = await fetch(beforePhotoUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.status}`);
        }
        const imageBlob = await imageResponse.blob();
        const arrayBuffer = await imageBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        console.log("Image size:", uint8Array.length, "bytes");
        
        // Chunked base64 conversion to avoid stack overflow on large images
        let binaryString = '';
        const chunkSize = 8192;
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binaryString += String.fromCharCode.apply(null, chunk as unknown as number[]);
        }
        const base64 = btoa(binaryString);
        
        const mimeType = imageBlob.type || 'image/jpeg';
        const base64Url = `data:${mimeType};base64,${base64}`;
        
        const userPrompt = `Create an inspiring "goal achieved" version of this fitness photo, showing the positive results of a healthy diet and exercise program. ${transformationDesc}

This is a motivational visualization showing what they can achieve with dedication.

DETAILS:
- Current weight: ${currentWeight || 180} lbs → Goal weight: ${goalWeight || 165} lbs
- Generate in PORTRAIT orientation (3:4 ratio, taller than wide)
- Keep the same person, just healthier and fitter
- Show realistic, achievable results`;

        response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: userPrompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: base64Url,
                  },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
          }),
        });
      } catch (fetchError) {
        console.error("Error fetching image from URL:", fetchError);
        throw new Error("Failed to fetch your photo. Please try uploading again.");
      }
    } else {
      // No photo provided - generate a generic inspiration image
      console.log("No photo provided, generating generic image");
      
      const genderDesc = gender === "female" ? "woman" : gender === "male" ? "man" : "person";
      const genericPrompt = `Generate a PORTRAIT orientation (3:4 aspect ratio, taller than wide) ultra realistic fitness transformation photo of a fit, healthy ${genderDesc} with ${transformationDesc.toLowerCase()}. Professional fitness photography, studio lighting, confident standing pose, athletic wear. High quality, photorealistic, inspiring fitness result. Full body visible from head to feet in vertical format.`;

      response = await fetch("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: genericPrompt,
            },
          ],
          modalities: ["image", "text"],
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log("AI response received, checking for image...");
    
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      throw new Error("Failed to generate transformation image. The AI could not process your photo.");
    }

    console.log("Successfully generated transformation image");

    return new Response(
      JSON.stringify({ image: imageUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
