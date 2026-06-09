import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useOrg } from '@/contexts/OrgContext'
import { TrainerLayout } from '@/components/TrainerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'

export default function TrainerBranding() {
  const { org, refresh } = useOrg()
  const [appName, setAppName] = useState('')
  const [primaryHsl, setPrimaryHsl] = useState('')
  const [accentHsl, setAccentHsl] = useState('')
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!org) return
    setAppName(org.branding?.app_name ?? org.name)
    setPrimaryHsl(org.branding?.primary_hsl ?? '160 100% 50%')
    setAccentHsl(org.branding?.accent_hsl ?? '280 100% 65%')
  }, [org?.id])

  const handleSave = async () => {
    if (!org) return
    setSaving(true)
    try {
      let logoUrl = org.branding?.logo_url
      if (logoFile) {
        const ext = logoFile.name.split('.').pop()?.toLowerCase() ?? 'png'
        const path = `${org.id}/logo.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('org-branding')
          .upload(path, logoFile, { upsert: true })
        if (uploadErr) throw uploadErr
        const { data: pub } = supabase.storage.from('org-branding').getPublicUrl(path)
        logoUrl = pub.publicUrl
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          branding: {
            ...org.branding,
            app_name: appName,
            primary_hsl: primaryHsl,
            accent_hsl: accentHsl,
            logo_url: logoUrl,
          },
        })
        .eq('id', org.id)
      if (error) throw error
      await refresh()
      toast({ title: 'Branding saved' })
    } catch (e) {
      toast({ title: 'Save failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <TrainerLayout title="Branding">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>White-label appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="app-name">App name</Label>
            <Input id="app-name" value={appName} onChange={e => setAppName(e.target.value)} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="primary">Primary HSL</Label>
              <Input
                id="primary"
                placeholder="e.g. 160 100% 50%"
                value={primaryHsl}
                onChange={e => setPrimaryHsl(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">Format: hue saturation% lightness%</p>
            </div>
            <div>
              <Label htmlFor="accent">Accent HSL</Label>
              <Input
                id="accent"
                placeholder="e.g. 280 100% 65%"
                value={accentHsl}
                onChange={e => setAccentHsl(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <div
              className="w-16 h-16 rounded border"
              style={{ background: `hsl(${primaryHsl})` }}
              title="Primary preview"
            />
            <div
              className="w-16 h-16 rounded border"
              style={{ background: `hsl(${accentHsl})` }}
              title="Accent preview"
            />
          </div>

          <div>
            <Label htmlFor="logo">Logo</Label>
            <Input
              id="logo"
              type="file"
              accept="image/*"
              onChange={e => setLogoFile(e.target.files?.[0] ?? null)}
            />
            {org?.branding?.logo_url && (
              <img src={org.branding.logo_url} alt="logo" className="mt-2 h-16 w-auto" />
            )}
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save branding'}
          </Button>
        </CardContent>
      </Card>
    </TrainerLayout>
  )
}
