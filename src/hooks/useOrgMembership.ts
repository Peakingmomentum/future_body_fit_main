import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'

export interface OrgMembership {
  org_id: string
  role: 'owner' | 'staff'
}

// Returns the caller's org_members row if they are trainer staff, or null
// if they are an end-user (or unauthenticated). Used to gate /trainer/*.
export function useOrgMembership() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['org-membership', user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<OrgMembership | null> => {
      const { data, error } = await supabase
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return (data as OrgMembership | null) ?? null
    },
  })
}
