import { useState } from 'react'
import { useEffectiveLibrary, hideBaseExercise, restoreBaseExercise } from '@/hooks/useEffectiveLibrary'
import { useOrgMembership } from '@/hooks/useOrgMembership'
import { TrainerLayout } from '@/components/TrainerLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'

export default function TrainerLibrary() {
  const { data: library, isLoading, refetch } = useEffectiveLibrary()
  const { data: membership } = useOrgMembership()
  const [filter, setFilter] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const filtered = (library ?? []).filter(e =>
    !filter ? true : e.name.toLowerCase().includes(filter.toLowerCase()),
  )

  const handleHide = async (id: string) => {
    if (!membership) return
    setBusyId(id)
    try {
      await hideBaseExercise(membership.org_id, id)
      await refetch()
      toast({ title: 'Exercise hidden from your library' })
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusyId(null)
    }
  }

  const handleRestore = async (id: string) => {
    if (!membership) return
    setBusyId(id)
    try {
      await restoreBaseExercise(membership.org_id, id)
      await refetch()
      toast({ title: 'Exercise restored' })
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setBusyId(null)
    }
  }

  return (
    <TrainerLayout title="Workout library">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <Input
            placeholder="Search exercises…"
            value={filter}
            onChange={e => setFilter(e.target.value)}
            className="max-w-sm"
          />
          <div className="text-sm text-muted-foreground">
            {library ? `${filtered.length} of ${library.length}` : '…'}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(ex => (
              <Card key={ex.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{ex.name}</div>
                    <Badge variant={ex.source === 'custom' ? 'default' : 'secondary'}>{ex.source}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {ex.equipment ?? '—'} · {(ex.target_muscles ?? []).join(', ') || '—'}
                  </div>
                  <div className="flex gap-2 pt-1">
                    {ex.source === 'base' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === ex.id}
                        onClick={() => handleHide(ex.id)}
                      >
                        Hide
                      </Button>
                    )}
                    {ex.source === 'replaced' && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busyId === ex.id}
                        onClick={() => handleRestore(ex.id)}
                      >
                        Restore base
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </TrainerLayout>
  )
}
