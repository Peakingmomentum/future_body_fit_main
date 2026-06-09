import { useEffect, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { REFERRAL_KEY } from '@/pages/AffiliateRedirect'

const REFERRAL_ORG_KEY = 'fb_referral_org_id'

// On first authed render after a referral redirect, write referred_by_org_id
// onto the user's profile and clear the localStorage flag. Mounting this once
// at the app root is enough — the effect runs only when a user is present and
// a referral org is stashed.
export function ReferralAttribution({ children }: { children: ReactNode }) {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return
    const orgId = localStorage.getItem(REFERRAL_ORG_KEY)
    if (!orgId) return

    ;(async () => {
      // Don't overwrite an existing attribution.
      const { data: profile } = await supabase
        .from('profiles')
        .select('referred_by_org_id')
        .eq('id', user.id)
        .maybeSingle()
      if (profile && !(profile as any).referred_by_org_id) {
        await supabase
          .from('profiles')
          .update({ referred_by_org_id: orgId })
          .eq('id', user.id)
      }
      localStorage.removeItem(REFERRAL_KEY)
      localStorage.removeItem(REFERRAL_ORG_KEY)
    })()
  }, [user?.id])

  return <>{children}</>
}
