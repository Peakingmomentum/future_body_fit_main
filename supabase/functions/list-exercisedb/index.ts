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
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    if (!RAPIDAPI_KEY) throw new Error("RAPIDAPI_KEY not configured");

    const url = new URL(req.url);
    const bodyPart = url.searchParams.get("bodyPart");
    const equipment = url.searchParams.get("equipment");
    const target = url.searchParams.get("target");
    const offset = url.searchParams.get("offset") || "0";
    const limit = url.searchParams.get("limit") || "100";

    let endpoint = `https://exercisedb.p.rapidapi.com/exercises?limit=${limit}&offset=${offset}`;

    if (bodyPart) {
      endpoint = `https://exercisedb.p.rapidapi.com/exercises/bodyPart/${encodeURIComponent(bodyPart)}?limit=${limit}&offset=${offset}`;
    } else if (equipment) {
      endpoint = `https://exercisedb.p.rapidapi.com/exercises/equipment/${encodeURIComponent(equipment)}?limit=${limit}&offset=${offset}`;
    } else if (target) {
      endpoint = `https://exercisedb.p.rapidapi.com/exercises/target/${encodeURIComponent(target)}?limit=${limit}&offset=${offset}`;
    }

    console.log("Fetching from ExerciseDB:", endpoint);

    const response = await fetch(endpoint, {
      headers: {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ExerciseDB API error ${response.status}: ${errorText}`);
    }

    const exercises = await response.json();

    // Also fetch available body parts, equipment, and targets for reference
    const listsNeeded = url.searchParams.get("lists") === "true";
    let lists = null;

    if (listsNeeded) {
      const [bodyPartsRes, equipmentRes, targetsRes] = await Promise.all([
        fetch("https://exercisedb.p.rapidapi.com/exercises/bodyPartList", {
          headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": "exercisedb.p.rapidapi.com" },
        }),
        fetch("https://exercisedb.p.rapidapi.com/exercises/equipmentList", {
          headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": "exercisedb.p.rapidapi.com" },
        }),
        fetch("https://exercisedb.p.rapidapi.com/exercises/targetList", {
          headers: { "X-RapidAPI-Key": RAPIDAPI_KEY, "X-RapidAPI-Host": "exercisedb.p.rapidapi.com" },
        }),
      ]);

      lists = {
        bodyParts: bodyPartsRes.ok ? await bodyPartsRes.json() : [],
        equipment: equipmentRes.ok ? await equipmentRes.json() : [],
        targets: targetsRes.ok ? await targetsRes.json() : [],
      };
    }

    // Simplify exercise data for display
    const simplified = Array.isArray(exercises) ? exercises.map((e: any) => ({
      id: e.id,
      name: e.name,
      bodyPart: e.bodyPart,
      target: e.target,
      equipment: e.equipment,
      secondaryMuscles: e.secondaryMuscles,
    })) : [];

    return new Response(
      JSON.stringify({ count: simplified.length, exercises: simplified, lists }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Failed to list exercises";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
