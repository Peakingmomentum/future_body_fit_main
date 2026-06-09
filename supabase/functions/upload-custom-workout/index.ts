import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

// Two-step trainer upload:
//   1) POST { step: 'sign', filename, content_type } -> { upload_url, storage_path }
//      Client PUTs the binary to upload_url directly (Supabase signed upload URL).
//   2) POST { step: 'commit', title, description, ..., storage_path, media_kind, plan_data }
//      -> Inserts a custom_workouts row referencing the uploaded media.
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

    const { data: membership } = await client
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) return jsonResponse({ error: 'Not an org staff member' }, 403)

    const body = await req.json()

    if (body.step === 'sign') {
      const { filename, content_type } = body
      if (!filename) return jsonResponse({ error: 'filename required' }, 400)
      const ext = filename.split('.').pop()?.toLowerCase() ?? 'mp4'
      const objectName = `${membership.org_id}/workouts/${crypto.randomUUID()}.${ext}`

      const { data, error } = await client.storage
        .from('org-media')
        .createSignedUploadUrl(objectName)
      if (error) throw error

      return jsonResponse({
        upload_url: data.signedUrl,
        storage_path: objectName,
        content_type: content_type ?? 'application/octet-stream',
      })
    }

    if (body.step === 'commit') {
      const {
        title,
        description,
        target_muscles,
        equipment,
        difficulty,
        duration_minutes,
        storage_path,
        media_kind,
        plan_data,
      } = body
      if (!title || !storage_path) {
        return jsonResponse({ error: 'title and storage_path required' }, 400)
      }
      const { data, error } = await client
        .from('custom_workouts')
        .insert({
          org_id: membership.org_id,
          created_by: user.id,
          title,
          description: description ?? null,
          target_muscles: target_muscles ?? [],
          equipment: equipment ?? [],
          difficulty: difficulty ?? null,
          duration_minutes: duration_minutes ?? null,
          media_url: storage_path,
          media_kind: media_kind ?? 'mp4',
          plan_data: plan_data ?? {},
        })
        .select('*')
        .single()
      if (error) throw error
      return jsonResponse({ workout: data })
    }

    return jsonResponse({ error: "step must be 'sign' or 'commit'" }, 400)
  } catch (e) {
    console.error('upload-custom-workout error', e)
    return jsonResponse({ error: (e as Error).message }, 500)
  }
})
