import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useOrgMembership } from '@/hooks/useOrgMembership'
import { useEffectiveLibrary } from '@/hooks/useEffectiveLibrary'
import { TrainerLayout } from '@/components/TrainerLayout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from '@/hooks/use-toast'

export default function TrainerCommunity() {
  const { user } = useAuth()
  const { data: membership } = useOrgMembership()
  const { data: library } = useEffectiveLibrary()
  const orgId = membership?.org_id

  const posts = useQuery({
    queryKey: ['feed-posts', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('org_feed_posts')
        .select('*')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    },
  })

  const [body, setBody] = useState('')
  const [externalLink, setExternalLink] = useState('')
  const [wodId, setWodId] = useState('')
  const [posting, setPosting] = useState(false)

  const submitPost = async () => {
    if (!orgId || !user || !body) return
    setPosting(true)
    try {
      const { error } = await supabase.from('org_feed_posts').insert({
        org_id: orgId,
        author_id: user.id,
        body,
        external_link: externalLink || null,
      })
      if (error) throw error
      setBody('')
      setExternalLink('')
      await posts.refetch()
      toast({ title: 'Posted to community' })
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    } finally {
      setPosting(false)
    }
  }

  const setWod = async () => {
    if (!orgId || !user || !wodId) return
    const today = new Date().toISOString().slice(0, 10)
    const picked = library?.find(e => e.id === wodId)
    try {
      const { error } = await supabase.from('workout_of_the_day').upsert(
        {
          org_id: orgId,
          day: today,
          workout_id: wodId,
          workout_source: picked?.source === 'custom' ? 'custom' : 'base',
          created_by: user.id,
        },
        { onConflict: 'org_id,day' },
      )
      if (error) throw error
      toast({ title: "Workout of the Day set" })
    } catch (e) {
      toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' })
    }
  }

  return (
    <TrainerLayout title="Community">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="font-medium">New post</div>
            <Textarea
              placeholder="What's the message for your community?"
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
            />
            <div>
              <Label htmlFor="ext">Live link (YouTube / IG Live, optional)</Label>
              <Input id="ext" value={externalLink} onChange={e => setExternalLink(e.target.value)} />
            </div>
            <Button onClick={submitPost} disabled={posting || !body}>
              {posting ? 'Posting…' : 'Post'}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="font-medium">Workout of the Day</div>
            <Label htmlFor="wod">Pick from library</Label>
            <select
              id="wod"
              className="w-full border border-input bg-background rounded-md px-3 py-2 text-sm"
              value={wodId}
              onChange={e => setWodId(e.target.value)}
            >
              <option value="">— Choose an exercise —</option>
              {(library ?? []).map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.source})
                </option>
              ))}
            </select>
            <Button onClick={setWod} disabled={!wodId}>
              Set today's WOD
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <div className="font-medium mb-3">Recent posts</div>
        <div className="space-y-3">
          {(posts.data ?? []).length === 0 && (
            <div className="text-sm text-muted-foreground">No posts yet.</div>
          )}
          {(posts.data ?? []).map((p: any) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="text-sm whitespace-pre-wrap">{p.body}</div>
                {p.external_link && (
                  <a
                    className="text-xs text-primary underline mt-2 inline-block"
                    href={p.external_link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {p.external_link}
                  </a>
                )}
                <div className="text-xs text-muted-foreground mt-2">
                  {new Date(p.created_at).toLocaleString()}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </TrainerLayout>
  )
}
