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

    console.log("Clone transformation request:", {
      beforePhoto: beforePhotoUrl ? "present" : "missing",
      goalType,
      gender,
    });

    const genderDesc = gender === "female" ? "woman" : gender === "male" ? "man" : "person";

    // Build a concrete, neutral physique description based on goal
    let physiqueDesc = "";
    if (goalType === "weight_loss") {
      physiqueDesc = `a lean, toned ${genderDesc} with a slim waist, visible abdominal definition, defined arms, and low body fat. Athletic and healthy-looking with a runner's build. The face should appear slightly slimmer with a more defined jawline and a leaner neck, consistent with healthy weight loss.`;
    } else if (goalType === "muscle_gain") {
      physiqueDesc = `a muscular, well-built ${genderDesc} with large biceps, broad shoulders, a wide chest, defined abs, and strong legs. Bodybuilder-level muscle development with a V-taper physique. The neck should appear slightly thicker and more muscular to match the overall build.`;
    } else if (goalType === "toning") {
      physiqueDesc = `a toned, athletic ${genderDesc} with visible muscle definition in the arms, shoulders, and core. Lean body composition with a fit, active appearance. The face should look slightly leaner with a more defined jawline.`;
    } else if (goalType === "strength") {
      physiqueDesc = `a powerful, strong-looking ${genderDesc} with thick arms and forearms, wide shoulders, a solid core, and muscular legs. Dense, functional muscle mass like an athlete or powerlifter. The neck should appear slightly thicker and stronger.`;
    } else {
      physiqueDesc = `a fit, healthy-looking ${genderDesc} with good muscle definition, low body fat, and an athletic posture. Looks like someone who exercises regularly. The face and neck should appear slightly leaner and healthier.`;
    }

    // Helper function to convert URL to base64
    const urlToBase64 = async (url: string): Promise<string> => {
      if (url.startsWith('data:')) return url;
      
      console.log("Fetching image from URL...");
      const imageResponse = await fetch(url);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      const imageBlob = await imageResponse.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let binaryString = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode.apply(null, chunk as unknown as number[]);
      }
      const base64 = btoa(binaryString);
      const mimeType = imageBlob.type || 'image/jpeg';
      return `data:${mimeType};base64,${base64}`;
    };

    // Helper: fetch with retry/backoff
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    const getRetryDelay = (response: Response | null, attempt: number) => {
      const retryAfter = response?.headers.get("Retry-After");
      if (retryAfter) {
        const secondsDelay = Number.parseInt(retryAfter, 10);
        if (!Number.isNaN(secondsDelay) && secondsDelay > 0) return secondsDelay * 1000;
        const dateDelay = new Date(retryAfter).getTime() - Date.now();
        if (dateDelay > 0) return dateDelay;
      }
      return Math.min(1500 * Math.pow(2, attempt), 8000) + Math.floor(Math.random() * 800);
    };

    const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 4): Promise<Response> => {
      let lastResponse: Response | null = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const res = await fetch(url, options);
        lastResponse = res;
        if (res.ok) return res;
        const shouldRetry = res.status === 429 || res.status >= 500;
        if (!shouldRetry || attempt === maxRetries - 1) return res;
        const waitMs = getRetryDelay(res, attempt);
        console.log(`Temporary error ${res.status}. Retry ${attempt + 1}/${maxRetries - 1} in ${waitMs}ms...`);
        await res.text();
        await wait(waitMs);
      }
      return lastResponse ?? new Response(null, { status: 500 });
    };

    let response;

    if (beforePhotoUrl) {
      // Edit the existing photo — use concrete, professional description
      let bodyImageBase64 = beforePhotoUrl;
      if (!beforePhotoUrl.startsWith('data:')) {
        bodyImageBase64 = await urlToBase64(beforePhotoUrl);
      }

      const editPrompt = `Edit this photo to show the same person with the physique of ${physiqueDesc}

Keep the exact same pose, background, clothing, and camera angle. The image must remain in portrait/vertical orientation. Only change the body composition and musculature — everything else stays identical. This is for a professional fitness progress visualization.`;

      console.log("Generating body transformation from existing photo...");
      response = await fetchWithRetry("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: editPrompt },
                { type: "image_url", image_url: { url: bodyImageBase64 } },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });
    } else {
      // Generate from scratch
      const prompt = `Professional fitness photography of ${physiqueDesc} Standing in a confident, neutral pose wearing athletic clothing. Studio lighting, clean background. Portrait orientation. High quality, photorealistic.`;

      console.log("Generating transformation from scratch...");
      response = await fetchWithRetry("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: prompt }],
          modalities: ["image", "text"],
        }),
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI is temporarily busy. Please try again in a moment.", retryable: true, suggestedRetryMs: 20000 }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "20" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please contact support." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const transformedUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!transformedUrl) {
      console.warn("No image in response, trying fallback generation...");
      
      const fallbackPrompt = `Professional fitness photo of ${physiqueDesc} Confident pose, athletic wear, studio lighting, clean background. Portrait orientation. Photorealistic.`;
      
      const fallbackResponse = await fetchWithRetry("https://ai-gateway.vercel.sh/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${AI_GATEWAY_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [{ role: "user", content: fallbackPrompt }],
          modalities: ["image", "text"],
        }),
      });

      if (!fallbackResponse.ok) throw new Error("Failed to generate transformation image.");

      const fallbackData = await fallbackResponse.json();
      const fallbackImage = fallbackData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!fallbackImage) throw new Error("Failed to generate transformation image.");

      return new Response(
        JSON.stringify({ image: fallbackImage, faceSwapApplied: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Transformation generated successfully");
    return new Response(
      JSON.stringify({ image: transformedUrl, faceSwapApplied: false }),
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
