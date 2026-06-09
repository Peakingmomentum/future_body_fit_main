import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

// Thin convenience wrapper around exercise_overrides. The client could write
// directly via the table (RLS allows it), but going through this function
// gives a stable surface for audit logs and future side-effects (e.g. clearing
// cached workout plans for the org).
//
// Body: { action: 'hide' | 'replace' | 'restore', base_exercise_id, replacement_exercise_id? }
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const authHeader = req.headers.get('Authorization') ?? ''
    const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await client.auth.getUser()
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401)

    // Resolve caller's org from membership (owner/staff only).
    const { data: membership } = await client
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) return jsonResponse({ error: 'Not an org staff member' }, 403)

    const { action, base_exercise_id, replacement_exercise_id } = await req.json()
    if (!action || !base_exercise_id) {
      return jsonResponse({ error: 'action and base_exercise_id required' }, 400)
    }

    if (action === 'restore') {
      const { error } = await client
        .from('exercise_overrides')
        .delete()
        .eq('org_id', membership.org_id)
        .eq('base_exercise_id', base_exercise_id)
      if (error) throw error
      return jsonResponse({ ok: true })
    }

    if (action === 'hide') {
      const { error } = await client
        .from('exercise_overrides')
        .upsert(
          { org_id: membership.org_id, base_exercise_id, action: 'hidden' },
          { onConflict: 'org_id,base_exercise_id' },
        )
      if (error) throw error
      return jsonResponse({ ok: true })
    }

    if (action === 'replace') {
      if (!replacement_exercise_id) {
        return jsonResponse({ error: 'replacement_exercise_id required for replace' }, 400)
      }
      const { error } = await client
        .from('exercise_overrides')
        .upsert(
          {
            org_id: membership.org_id,
            base_exercise_id,
            action: 'replaced',
            replacement_exercise_id,
          },
          { onConflict: 'org_id,base_exercise_id' },
        )
      if (error) throw error
      return jsonResponse({ ok: true })
    }

    return jsonResponse({ error: `unknown action: ${action}` }, 400)
  } catch (e) {
    console.error('library-curate error', e)
    return jsonResponse({ error: (e as Error).message }, 500)
  }
})
