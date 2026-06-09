import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { limit = 10 } = await req.json().catch(() => ({}));
    const batchSize = Math.min(limit, 20);

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find exercises with external URLs NOT already in our storage
    const { data: exercises, error: fetchError } = await supabase
      .from('exercises')
      .select('id, name, external_video_url')
      .not('external_video_url', 'is', null)
      .not('external_video_url', 'like', '%supabase.co/storage%')
      .limit(batchSize);

    if (fetchError) throw fetchError;

    if (!exercises || exercises.length === 0) {
      // Count already cached
      const { count: totalCached } = await supabase
        .from('exercises')
        .select('id', { count: 'exact', head: true })
        .like('external_video_url', '%supabase.co/storage%');

      return new Response(JSON.stringify({
        message: 'All exercises already cached!',
        cached: 0,
        failed: 0,
        remaining: 0,
        totalCached: totalCached || 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let cached = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const exercise of exercises) {
      try {
        const sourceUrl = exercise.external_video_url;

        // Download the GIF from the current URL
        const gifResponse = await fetch(sourceUrl);

        if (gifResponse.status === 429) {
          return new Response(JSON.stringify({
            message: 'Rate limited. Try again later.',
            cached,
            failed,
            remaining: exercises.length - cached - failed,
            quotaExceeded: true,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        if (!gifResponse.ok) {
          errors.push(`${exercise.name}: source returned ${gifResponse.status}`);
          failed++;
          continue;
        }

        const gifData = await gifResponse.arrayBuffer();
        const fileName = `${exercise.id}.gif`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('exercise-gifs')
          .upload(fileName, gifData, {
            contentType: 'image/gif',
            upsert: true,
          });

        if (uploadError) {
          errors.push(`${exercise.name}: upload failed - ${uploadError.message}`);
          failed++;
          continue;
        }

        // Get public URL and update DB
        const { data: publicUrlData } = supabase.storage
          .from('exercise-gifs')
          .getPublicUrl(fileName);

        const { error: updateError } = await supabase
          .from('exercises')
          .update({ external_video_url: publicUrlData.publicUrl })
          .eq('id', exercise.id);

        if (updateError) {
          errors.push(`${exercise.name}: DB update failed - ${updateError.message}`);
          failed++;
          continue;
        }

        cached++;
        console.log(`Cached: ${exercise.name}`);

        // Delay between requests
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${exercise.name}: ${msg}`);
        failed++;
      }
    }

    // Count remaining
    const { count: remaining } = await supabase
      .from('exercises')
      .select('id', { count: 'exact', head: true })
      .not('external_video_url', 'is', null)
      .not('external_video_url', 'like', '%supabase.co/storage%');

    const { count: totalCached } = await supabase
      .from('exercises')
      .select('id', { count: 'exact', head: true })
      .like('external_video_url', '%supabase.co/storage%');

    return new Response(JSON.stringify({
      message: `Cached ${cached} GIFs, ${failed} failed`,
      cached,
      failed,
      remaining: remaining || 0,
      totalCached: totalCached || 0,
      errors: errors.length > 0 ? errors : undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Cache exercise GIFs error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
