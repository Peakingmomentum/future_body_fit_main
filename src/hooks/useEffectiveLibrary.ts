import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useOrg } from '@/contexts/OrgContext'

export interface LibraryExercise {
  id: string
  name: string
  target_muscles: string[] | null
  equipment: string | null
  difficulty: string | null
  video_url: string | null
  media_url: string | null
  source: 'base' | 'replaced' | 'custom'
  org_id: string
}

// Reads the effective_exercise_library view defined in 20260608100600_exercise_overrides.sql.
// Returns the live, org-scoped library (base − hidden + replacements + custom).
export function useEffectiveLibrary() {
  const { org } = useOrg()
  return useQuery({
    queryKey: ['effective-exercise-library', org?.id],
    enabled: !!org?.id,
    queryFn: async (): Promise<LibraryExercise[]> => {
      const { data, error } = await supabase
        .from('effective_exercise_library' as any)
        .select('*')
        .order('name')
      if (error) throw error
      return (data ?? []) as LibraryExercise[]
    },
  })
}

// Hide a base exercise for the caller's org.
export async function hideBaseExercise(orgId: string, baseExerciseId: string) {
  const { error } = await supabase.from('exercise_overrides' as any).upsert(
    { org_id: orgId, base_exercise_id: baseExerciseId, action: 'hidden' },
    { onConflict: 'org_id,base_exercise_id' },
  )
  if (error) throw error
}

// Replace a base exercise with one of the org's custom_exercises.
export async function replaceBaseExercise(orgId: string, baseExerciseId: string, replacementId: string) {
  const { error } = await supabase.from('exercise_overrides' as any).upsert(
    {
      org_id: orgId,
      base_exercise_id: baseExerciseId,
      action: 'replaced',
      replacement_exercise_id: replacementId,
    },
    { onConflict: 'org_id,base_exercise_id' },
  )
  if (error) throw error
}

// Restore a base exercise (remove the override).
export async function restoreBaseExercise(orgId: string, baseExerciseId: string) {
  const { error } = await supabase
    .from('exercise_overrides' as any)
    .delete()
    .eq('org_id', orgId)
    .eq('base_exercise_id', baseExerciseId)
  if (error) throw error
}
