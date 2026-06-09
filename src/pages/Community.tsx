import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useOrg } from '@/contexts/OrgContext'
import { AppNav } from '@/components/AppNav'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Heart, MessageCircle } from 'lucide-react'

interface FeedPost {
  id: string
  body: string
  external_link: string | null
  created_at: string
  author_id: string
}

export default function Community() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const { org } = useOrg()
  const qc = useQueryClient()

  useEffect(() => {
    if (!loading && !user) navigate('/auth')
  }, [user, loading, navigate])

  const posts = useQuery({
    queryKey: ['community-feed', org?.id],
    enabled: !!org?.id,
    queryFn: async (): Promise<FeedPost[]> => {
      const { data, error } = await supabase
        .from('org_feed_posts')
        .select('*')
        .eq('org_id', org!.id)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data as FeedPost[]
    },
  })

  const react = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('post_reactions')
        .upsert(
          { post_id: postId, user_id: user!.id, emoji: '❤' },
          { onConflict: 'post_id,user_id,emoji' },
        )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['community-feed', org?.id] }),
  })

  if (loading || posts.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background dark">
      <AppNav />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-semibold">
          {org?.branding?.app_name ?? org?.name ?? 'Community'} feed
        </h1>

        {(posts.data ?? []).length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No posts yet — check back soon.
            </CardContent>
          </Card>
        )}

        {(posts.data ?? []).map(p => (
          <Card key={p.id}>
            <CardContent className="p-4 space-y-3">
              <div className="text-sm whitespace-pre-wrap">{p.body}</div>
              {p.external_link && (
                <a
                  href={p.external_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-sm underline"
                >
                  Watch live →
                </a>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{new Date(p.created_at).toLocaleString()}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => react.mutate(p.id)}
                  className="h-7"
                >
                  <Heart className="w-4 h-4 mr-1" /> React
                </Button>
                <span className="inline-flex items-center">
                  <MessageCircle className="w-4 h-4 mr-1" /> Comments
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
