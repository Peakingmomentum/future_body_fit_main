import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useOrgMembership } from '@/hooks/useOrgMembership'
import { TrainerLayout } from '@/components/TrainerLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'

export default function TrainerMeals() {
  const { data: membership } = useOrgMembership()
  const orgId = membership?.org_id

  const meals = useQuery({
    queryKey: ['custom-meals', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_meal_plans')
        .select('*')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [calories, setCalories] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!orgId || !title) return
    setCreating(true)
    try {
      const { error } = await supabase.from('custom_meal_plans').insert({
        org_id: orgId,
        title,
        description: description || null,
        calories: calories ? Number(calories) : null,
        meals: [],
        macros: {},
        is_published: true,
      })
      if (error) throw error
      setTitle('')
      setDescription('')
      setCalories('')
      await meals.refetch()
      toast({ title: 'Meal plan created' })
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <TrainerLayout title="Meal plans">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="font-medium">New meal plan</div>
            <div>
              <Label htmlFor="m-title">Title</Label>
              <Input id="m-title" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="m-desc">Description</Label>
              <Textarea id="m-desc" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="m-cal">Daily calories</Label>
              <Input
                id="m-cal"
                type="number"
                value={calories}
                onChange={e => setCalories(e.target.value)}
              />
            </div>
            <Button onClick={handleCreate} disabled={creating || !title}>
              {creating ? 'Creating…' : 'Create plan'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="font-medium mb-2">Existing plans</div>
            {(meals.data ?? []).length === 0 && (
              <div className="text-sm text-muted-foreground">No meal plans yet.</div>
            )}
            {(meals.data ?? []).map((m: any) => (
              <div key={m.id} className="border rounded p-3">
                <div className="font-medium">{m.title}</div>
                <div className="text-xs text-muted-foreground">{m.calories ? `${m.calories} kcal` : '—'}</div>
                {m.description && <div className="text-sm mt-1">{m.description}</div>}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </TrainerLayout>
  )
}
