import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

const STOCK_ORG_ID = '00000000-0000-0000-0000-00000000f17b'

export interface OrgBranding {
  app_name?: string
  logo_url?: string
  primary_hsl?: string
  accent_hsl?: string
  support_email?: string
  ios_bundle_id?: string
  android_package?: string
}

export interface Org {
  id: string
  slug: string
  name: string
  branding: OrgBranding
  plan: string
  is_stock: boolean
}

interface OrgContextType {
  org: Org | null
  loading: boolean
  isStock: boolean
  refresh: () => Promise<void>
}

const OrgContext = createContext<OrgContextType | undefined>(undefined)

// Resolve which org the current browser context belongs to.
// Web: subdomain (e.g. `daniel.futurebody.app` → slug `daniel`).
// Native: process.env.VITE_ORG_SLUG baked at build time.
// Authed user: their profile.org_id takes precedence over both.
function resolveSlugFromHost(): string | null {
  if (typeof window === 'undefined') return null
  const host = window.location.hostname
  // Local / preview / apex → stock
  if (host === 'localhost' || host.startsWith('127.') || host === 'futurebody.app' || host === 'www.futurebody.app') {
    return null
  }
  const parts = host.split('.')
  // `<slug>.futurebody.app`
  if (parts.length >= 3 && parts.slice(-2).join('.') === 'futurebody.app') {
    return parts[0]
  }
  return null
}

const BUILD_ORG_SLUG = (import.meta as any).env?.VITE_ORG_SLUG as string | undefined

export function OrgProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [org, setOrg] = useState<Org | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)

    // 1) Authed user: derive org from their profile.
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .maybeSingle()
      const orgId = (profile as any)?.org_id ?? STOCK_ORG_ID
      const { data } = await supabase
        .from('organizations')
        .select('id, slug, name, branding, plan, is_stock')
        .eq('id', orgId)
        .maybeSingle()
      if (data) {
        setOrg(data as unknown as Org)
        setLoading(false)
        return
      }
    }

    // 2) Unauthed: subdomain or build-time slug.
    const slug = resolveSlugFromHost() ?? BUILD_ORG_SLUG ?? 'future-body'
    const { data } = await supabase
      .from('organizations')
      .select('id, slug, name, branding, plan, is_stock')
      .eq('slug', slug)
      .maybeSingle()
    setOrg((data as unknown as Org) ?? null)
    setLoading(false)
  }

  useEffect(() => {
    if (authLoading) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, authLoading])

  return (
    <OrgContext.Provider value={{ org, loading, isStock: !!org?.is_stock, refresh: load }}>
      {children}
    </OrgContext.Provider>
  )
}

export function useOrg() {
  const ctx = useContext(OrgContext)
  if (!ctx) throw new Error('useOrg must be used within an OrgProvider')
  return ctx
}

export { STOCK_ORG_ID }
