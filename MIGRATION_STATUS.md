# Migration Status — Off Lovable → Vercel + own Supabase

Last updated: 2026-06-11

## TL;DR
Frontend is live on Vercel pointing at our own Supabase project. Schema + all
1,398 exercises migrated. All 27 edge functions deployed. AI functions rewired
to Vercel AI Gateway. **Remaining: set edge-function secrets + redeploy the 8
AI functions + verify.**

## Key identifiers
- **New Supabase project ref:** `zkwxghxxroenccoughoa` (org "Peaking Momentum" = `wdukqyjftpasgljhkwmw`, region us-west-1)
- **New Supabase URL:** https://zkwxghxxroenccoughoa.supabase.co
- **New DB password:** `ju2xwiiIi4uMNnNg5jCo7BKzUDow`
- **Vercel project:** `future-body-fit-main` (peakingmomentum-7485s-projects)
- **Production URL:** https://future-body-fit-main.vercel.app
- **GitHub:** https://github.com/Peakingmomentum/future_body_fit_main
- **Old Lovable Supabase ref (data source, read-only via Lovable MCP):** `5c6ef0f7-7885-480a-925f-4e1a4c68a4d8`
- Supabase access token is in macOS Keychain: `security find-generic-password -s "Supabase CLI" -w`

## Done
- [x] GitHub repo created + pushed
- [x] Vercel project linked, env vars set (all 3 environments), production deployed
- [x] New Supabase project provisioned (ACTIVE_HEALTHY)
- [x] All 21 migrations applied to new DB (14 original Lovable + 7 new B2B)
- [x] 1,398 exercises migrated from Lovable DB → new DB
- [x] Vercel env vars repointed to new project, production redeployed
- [x] All 27 edge functions deployed to new project
- [x] 8 AI functions swapped from Lovable gateway → Vercel AI Gateway (committed)
- [x] Fixed duplicate `generate-meals` block in supabase/config.toml

## Remaining
1. **Get Vercel AI Gateway key** — vercel.com → AI Gateway → API Keys → `vck_...`. Add funds / spend limit.
2. **Set edge-function secrets** on project `zkwxghxxroenccoughoa`:
   - `AI_GATEWAY_API_KEY` = the `vck_...` key
   - `RAPIDAPI_KEY`, `REPLICATE_API_KEY`, `SEGMIND_API_KEY` = reveal & copy from Lovable (not locked)
   - `STRIPE_SECRET_KEY` = from your own Stripe dashboard (dashboard.stripe.com → API keys)
   - Set via: `export SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -w); npx supabase secrets set NAME=value --project-ref zkwxghxxroenccoughoa`
3. **Redeploy the 8 swapped AI functions** (deployed copies still run old Lovable code):
   ```bash
   cd "/Users/Apple/Documents/Your Future Body"
   export SUPABASE_ACCESS_TOKEN=$(security find-generic-password -s "Supabase CLI" -w)
   for fn in generate-meals generate-pace-milestone swap-exercise fitness-buddy \
             generate-clone-transformation generate-workout generate-transformation \
             generate-exercise-demo; do
     npx supabase functions deploy $fn --project-ref zkwxghxxroenccoughoa --use-api --no-verify-jwt
   done
   ```
4. **Verify** `generate-workout` end to end (sign in, generate a workout, confirm it pulls from the 1,398-exercise library).

## AI Gateway model mapping (already applied in code)
- text: `google/gemini-3-flash-preview` → `google/gemini-2.5-flash`
- image: `google/gemini-3.1-flash-image-preview` → `google/gemini-2.5-flash-image-preview`
- endpoint: `https://ai.gateway.lovable.dev/v1` → `https://ai-gateway.vercel.sh/v1`
- env key: `LOVABLE_API_KEY` → `AI_GATEWAY_API_KEY`

## B2B expansion shipped (in repo, schema live)
White-label trainer console (/trainer/*), end-user /community feed + WOD banner,
affiliate /r/:code flow, org multi-tenancy (organizations + org_members + org_id
scoping + RLS), library curation (exercise_overrides + effective_exercise_library
view), custom workouts/meals, per-seat billing + affiliate payout cron functions.

## Notes / gotchas
- Capacitor `capacitor.config.json` still points `server.url` at the Lovable
  preview URL — update to the Vercel URL before the next native build.
- Vercel CLI is a few versions behind; `npm i -g vercel@latest` when convenient.
- After regen, run `supabase gen types typescript` against the new project to
  drop the `as any` casts in the trainer pages.
