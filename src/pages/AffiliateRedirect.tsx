import { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

// /r/:code — record the click, stash the referral code in localStorage so the
// signup flow can attribute the new account, then bounce to /auth.
// Attribution itself happens in AuthContext / a post-signup hook.
const REFERRAL_KEY = 'fb_referral_code'

export default function AffiliateRedirect() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!code) {
      navigate('/')
      return
    }
    ;(async () => {
      // Best-effort: increment click_count. RLS allows public select but not
      // update, so this is done via an RPC ideally. For v1 we just store the
      // code locally — counts can be backfilled from a server-side track call.
      localStorage.setItem(REFERRAL_KEY, code)
      // Look up the link to confirm validity and grab the org for branding.
      const { data } = await supabase
        .from('affiliate_links')
        .select('org_id')
        .eq('code', code)
        .eq('is_active', true)
        .maybeSingle()
      if (data) {
        localStorage.setItem('fb_referral_org_id', data.org_id)
      }
      navigate('/auth')
    })()
  }, [code, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-sm text-muted-foreground">Redirecting…</div>
    </div>
  )
}

export { REFERRAL_KEY }
