import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

// Creates a new organization for the authenticated user and makes them its
// owner. Also moves their profile.org_id to the new org. Used by trainers
// signing up for white-label.
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: userErr } = await userClient.auth.getUser()
    if (userErr || !user) return jsonResponse({ error: 'Unauthorized' }, 401)

    const { name, slug, branding } = await req.json()
    if (!name || !slug) return jsonResponse({ error: 'name and slug required' }, 400)
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) {
      return jsonResponse({ error: 'slug must be 3-40 chars, lowercase letters/numbers/dashes' }, 400)
    }

    // Service role bypasses RLS so we can create the org + membership atomically.
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const { data: existing } = await admin
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (existing) return jsonResponse({ error: 'slug already taken' }, 409)

    const { data: org, error: orgErr } = await admin
      .from('organizations')
      .insert({
        slug,
        name,
        owner_id: user.id,
        plan: 'white_label',
        branding: branding ?? {},
      })
      .select('id, slug, name, branding, plan, is_stock')
      .single()
    if (orgErr) throw orgErr

    const { error: memberErr } = await admin
      .from('org_members')
      .insert({ org_id: org.id, user_id: user.id, role: 'owner' })
    if (memberErr) throw memberErr

    const { error: profileErr } = await admin
      .from('profiles')
      .update({ org_id: org.id })
      .eq('id', user.id)
    if (profileErr) throw profileErr

    return jsonResponse({ org })
  } catch (e) {
    console.error('org-signup error', e)
    return jsonResponse({ error: (e as Error).message }, 500)
  }
})
