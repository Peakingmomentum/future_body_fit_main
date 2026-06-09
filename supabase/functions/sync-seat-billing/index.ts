import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14?target=deno'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

// Nightly cron (configure in Supabase Scheduled Functions). For every
// white-label org with an active Stripe subscription, recompute the active
// end-user seat count and update the subscription's `quantity`.
//
// "Active" = profiles.last_active_at within the last 30 days, scoped to the
// org, excluding the org's staff (they shouldn't count as paid seats).
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const STRIPE_KEY = Deno.env.get('STRIPE_SECRET_KEY')!
    if (!STRIPE_KEY) throw new Error('STRIPE_SECRET_KEY not set')

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE)
    const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2024-11-20.acacia' })

    const { data: orgs, error } = await admin
      .from('organizations')
      .select('id, name, stripe_subscription_id')
      .eq('plan', 'white_label')
      .not('stripe_subscription_id', 'is', null)
    if (error) throw error

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const report: Array<{ org: string; seats: number; updated: boolean; error?: string }> = []

    for (const org of orgs ?? []) {
      // Active end-users for this org = profiles with org_id = org.id AND
      // last_active_at within 30 days, MINUS staff (org_members).
      const { data: staffRows } = await admin
        .from('org_members')
        .select('user_id')
        .eq('org_id', org.id)
      const staffIds = (staffRows ?? []).map((r: any) => r.user_id)

      let query = admin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', org.id)
        .gte('last_active_at', thirtyDaysAgo)
      if (staffIds.length > 0) {
        query = query.not('id', 'in', `(${staffIds.join(',')})`)
      }
      const { count } = await query
      const seats = count ?? 0

      try {
        const sub = await stripe.subscriptions.retrieve(org.stripe_subscription_id!)
        const item = sub.items.data[0]
        await stripe.subscriptionItems.update(item.id, { quantity: Math.max(seats, 1) })
        report.push({ org: org.name, seats, updated: true })
      } catch (e) {
        report.push({ org: org.name, seats, updated: false, error: (e as Error).message })
      }
    }

    return jsonResponse({ ok: true, processed: report.length, report })
  } catch (e) {
    console.error('sync-seat-billing error', e)
    return jsonResponse({ error: (e as Error).message }, 500)
  }
})
