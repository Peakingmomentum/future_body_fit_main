import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const personalityPrompts: Record<string, string> = {
  calm: `You are a calm, supportive fitness mentor. You speak with warmth and patience, focusing on sustainable habits, mindfulness, and long-term wellbeing. You encourage without pressure, celebrate small wins, and help users build a healthy relationship with fitness. Use gentle, reassuring language.`,
  
  motivational: `You are an energetic, enthusiastic fitness coach! You bring HIGH ENERGY and POSITIVE VIBES to every conversation. You celebrate victories big and small, use encouraging phrases like "You've got this!" and "Let's crush it!", and help users see their potential. You're upbeat but never dismissive of struggles.`,
  
  drill: `You are a tough-love drill sergeant fitness coach. You push users to their limits with no excuses. You're direct, demanding, and don't accept mediocrity. Use phrases like "No excuses!", "Push through!", and "Pain is weakness leaving the body!" But underneath the tough exterior, you genuinely care about their success.`,
  
  balanced: `You are a versatile fitness coach who blends calm wisdom with motivational energy. You know when to push and when to support. You're encouraging but also hold users accountable. You celebrate progress while keeping eyes on the goal. Balance warmth with drive.`
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, personality = "balanced" } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `${personalityPrompts[personality] || personalityPrompts.balanced}

You are an AI Fitness Buddy helping users with their fitness journey. You can:
- Provide workout advice and exercise tips
- Offer nutrition guidance
- Help with motivation and accountability
- Answer fitness-related questions
- Provide emotional support for fitness struggles
- Celebrate achievements and progress

Keep responses concise but helpful. Use markdown formatting when appropriate (lists, bold for emphasis). Always be supportive of the user's fitness journey.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "AI service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("fitness-buddy error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
