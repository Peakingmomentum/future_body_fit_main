# Deploy: Future Body Fit on Vercel

Vite SPA + Supabase backend. Vercel hosts the frontend bundle; Supabase
hosts the database + edge functions + auth + storage. No Vercel serverless
functions are used.

## 1. One-time Vercel setup

```bash
npm i -g vercel
vercel login
cd "Your Future Body"
vercel link        # creates .vercel/ (gitignored)
```

In the Vercel dashboard (Project → Settings → Environment Variables) add for
both Production and Preview:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://YOUR-PROJECT.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | anon/publishable key from Supabase |
| `VITE_SUPABASE_PROJECT_ID` | the project ref |

`vercel.json` already pins framework=vite, build=`npm run build`, output=`dist`,
and rewrites all SPA paths to `/index.html` so deep links (`/trainer/library`,
`/r/abc`, `/community`) survive a hard refresh.

## 2. Deploy

```bash
vercel              # preview deploy
vercel --prod       # production
```

The preview URL is safe to share — every branch and PR gets its own.

## 3. White-label subdomains

The OrgContext resolves the current org from the hostname pattern
`<slug>.futurebody.app`, so trainer apps just need a Vercel **wildcard
domain**:

1. In Vercel → Domains, add `futurebody.app` and `*.futurebody.app`.
2. Point your DNS at Vercel (CNAME `*.futurebody.app` → `cname.vercel-dns.com`).
3. Done — any new `daniel.futurebody.app` or `gymco.futurebody.app` resolves
   to the same deploy and the app self-themes via `organizations.branding`.

The apex (`futurebody.app` / `www.futurebody.app`) falls back to the stock
Future Body org.

## 4. Supabase side (unchanged by Vercel move)

```bash
supabase db push                  # apply migrations
supabase functions deploy org-signup
supabase functions deploy library-curate
supabase functions deploy upload-custom-workout
supabase functions deploy sync-seat-billing
supabase functions deploy affiliate-payout
supabase gen types typescript --linked > src/integrations/supabase/types.ts
```

Set edge function secrets in the Supabase dashboard:
- `STRIPE_SECRET_KEY` (used by `sync-seat-billing` and `affiliate-payout`)
- `LOVABLE_API_KEY` (kept for `generate-workout` until we cut over to direct Gemini)

Schedule the cron functions in Supabase:
- `sync-seat-billing` — nightly (`0 2 * * *`)
- `affiliate-payout` — monthly on the 1st (`0 3 1 * *`)

## 5. Capacitor (mobile)

Web deploys are now on Vercel, so update `capacitor.config.json` `server.url`
to your Vercel production URL (or a stable `app.futurebody.app` domain in
front of it) before the next native build:

```json
"server": { "url": "https://app.futurebody.app", "cleartext": false }
```

For per-trainer white-label native apps, bake the org slug in at build time:

```bash
VITE_ORG_SLUG=daniel npm run build && npx cap sync
```

This makes the native app boot directly into that trainer's org without
needing a subdomain.

## 6. Why we're off Lovable

Lovable's hosting is convenient but credit-metered. Vercel's free tier
covers preview deploys for our scale; the only thing we'd pay for is
bandwidth on production, which is far cheaper than Lovable credits.
Edge functions, database, auth, and storage all stay on Supabase regardless
of where the frontend lives.
