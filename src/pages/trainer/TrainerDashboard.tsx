import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useOrgMembership } from '@/hooks/useOrgMembership'
import { TrainerLayout } from '@/components/TrainerLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TrainerDashboard() {
  const { data: membership } = useOrgMembership()
  const orgId = membership?.org_id

  const stats = useQuery({
    queryKey: ['trainer-stats', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const [{ count: endUserCount }, { count: customCount }, { count: postCount }] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('org_id', orgId!),
        supabase.from('custom_workouts').select('id', { count: 'exact', head: true }).eq('org_id', orgId!),
        supabase.from('org_feed_posts').select('id', { count: 'exact', head: true }).eq('org_id', orgId!),
      ])
      return {
        endUsers: endUserCount ?? 0,
        customWorkouts: customCount ?? 0,
        feedPosts: postCount ?? 0,
      }
    },
  })

  const cards = [
    { label: 'End users', value: stats.data?.endUsers ?? '—' },
    { label: 'Custom workouts', value: stats.data?.customWorkouts ?? '—' },
    { label: 'Feed posts', value: stats.data?.feedPosts ?? '—' },
  ]

  return (
    <TrainerLayout title="Overview">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map(c => (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-semibold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </TrainerLayout>
  )
}
