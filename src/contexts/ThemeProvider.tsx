import { useEffect, ReactNode } from 'react'
import { useOrg } from '@/contexts/OrgContext'

// Maps org branding HSL values onto the CSS variables defined in src/index.css.
// The variables we override are the same ones Tailwind/shadcn read from :root.
const VAR_MAP: Record<keyof OrgBrandingHslKeys, string> = {
  primary_hsl: '--primary',
  accent_hsl: '--accent',
}
type OrgBrandingHslKeys = { primary_hsl: string; accent_hsl: string }

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { org } = useOrg()

  useEffect(() => {
    if (!org?.branding) return
    const root = document.documentElement
    const branding = org.branding as Partial<OrgBrandingHslKeys>
    for (const key of Object.keys(VAR_MAP) as (keyof OrgBrandingHslKeys)[]) {
      const value = branding[key]
      if (value) root.style.setProperty(VAR_MAP[key], value)
    }
    // Update document title to the white-labeled app name
    if (org.branding.app_name) document.title = org.branding.app_name

    return () => {
      // On org change, clear the inline overrides so a non-themed page (e.g. stock)
      // re-uses the index.css defaults.
      for (const cssVar of Object.values(VAR_MAP)) root.style.removeProperty(cssVar)
    }
  }, [org?.id, org?.branding])

  return <>{children}</>
}
