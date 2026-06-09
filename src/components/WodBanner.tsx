import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useOrg } from '@/contexts/OrgContext'
import { Card, CardContent } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

// Shows the trainer-picked Workout of the Day banner on the end-user dashboard.
// Hidden when no WOD is set for today or the user is on the stock org.
export function WodBanner() {
  const { org, isStock } = useOrg()
  const today = new Date().toISOString().slice(0, 10)

  const wod = useQuery({
    queryKey: ['wod', org?.id, today],
    enabled: !!org?.id && !isStock,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workout_of_the_day')
        .select('workout_id, workout_source, note')
        .eq('org_id', org!.id)
        .eq('day', today)
        .maybeSingle()
      if (error) throw error
      if (!data) return null

      // Resolve the workout title from the appropriate source.
      if (data.workout_source === 'custom') {
        const { data: cw } = await supabase
          .from('custom_workouts')
          .select('title, description')
          .eq('id', data.workout_id)
          .maybeSingle()
        return { title: cw?.title ?? 'Workout of the Day', description: cw?.description ?? data.note }
      }
      const { data: ex } = await supabase
        .from('exercises')
        .select('name')
        .eq('id', data.workout_id)
        .maybeSingle()
      return { title: ex?.name ?? 'Workout of the Day', description: data.note ?? null }
    },
  })

  if (!wod.data) return null

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10">
      <CardContent className="p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            {org?.branding?.app_name ?? org?.name}'s Workout of the Day
          </div>
          <div className="font-semibold">{wod.data.title}</div>
          {wod.data.description && (
            <div className="text-sm text-muted-foreground mt-1">{wod.data.description}</div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
