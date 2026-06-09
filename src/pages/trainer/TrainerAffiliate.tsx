import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useOrgMembership } from '@/hooks/useOrgMembership'
import { TrainerLayout } from '@/components/TrainerLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

function buildReferralUrl(code: string) {
  if (typeof window === 'undefined') return `https://futurebody.app/r/${code}`
  return `${window.location.origin}/r/${code}`
}

export default function TrainerAffiliate() {
  const { data: membership } = useOrgMembership()
  const orgId = membership?.org_id

  const links = useQuery({
    queryKey: ['affiliate-links', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_links')
        .select('*')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const payouts = useQuery({
    queryKey: ['affiliate-payouts', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('org_id', orgId!)
        .order('period_start', { ascending: false })
        .limit(12)
      if (error) throw error
      return data
    },
  })

  const [code, setCode] = useState('')
  const [label, setLabel] = useState('')
  const [creating, setCreating] = useState(false)

  const create = async () => {
    if (!orgId || !code) return
    if (!/^[a-z0-9-]{3,40}$/.test(code)) {
      toast({ title: 'Code must be 3-40 lowercase chars/dashes', variant: 'destructive' })
      return
    }
    setCreating(true)
    try {
      const { error } = await supabase
        .from('affiliate_links')
        .insert({ org_id: orgId, code, label: label || null })
      if (error) throw error
      setCode('')
      setLabel('')
      await links.refetch()
      toast({ title: 'Link created' })
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <TrainerLayout title="Affiliate">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="font-medium">Referral links</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <Label htmlFor="code">Code</Label>
                <Input id="code" value={code} onChange={e => setCode(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="label">Label</Label>
                <Input id="label" value={label} onChange={e => setLabel(e.target.value)} />
              </div>
            </div>
            <Button onClick={create} disabled={creating || !code}>
              {creating ? 'Creating…' : 'Create link'}
            </Button>

            <div className="space-y-2 pt-2">
              {(links.data ?? []).map((l: any) => (
                <div key={l.id} className="border rounded p-2 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-mono">{l.code}</div>
                    <div className="text-xs text-muted-foreground">
                      {l.label ?? '—'} · {l.signup_count ?? 0} signups
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(buildReferralUrl(l.code))
                      toast({ title: 'Copied link' })
                    }}
                  >
                    Copy
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="font-medium mb-3">Payouts (40% recurring)</div>
            {(payouts.data ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground">No payouts yet.</div>
            )}
            <div className="space-y-2">
              {(payouts.data ?? []).map((p: any) => (
                <div key={p.id} className="border rounded p-2 text-sm flex items-center justify-between">
                  <div>
                    <div>{p.period_start} → {p.period_end}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.referred_user_count} users · gross ${(p.gross_mrr_cents / 100).toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${(p.commission_cents / 100).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{p.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </TrainerLayout>
  )
}
