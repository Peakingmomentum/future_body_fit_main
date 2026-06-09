import { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useOrgMembership } from '@/hooks/useOrgMembership'
import { useOrg } from '@/contexts/OrgContext'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

const links = [
  { to: '/trainer', label: 'Overview', end: true },
  { to: '/trainer/branding', label: 'Branding' },
  { to: '/trainer/library', label: 'Library' },
  { to: '/trainer/meals', label: 'Meals' },
  { to: '/trainer/community', label: 'Community' },
  { to: '/trainer/affiliate', label: 'Affiliate' },
]

export function TrainerLayout({ children, title }: { children: ReactNode; title: string }) {
  const navigate = useNavigate()
  const { org } = useOrg()
  const { data: membership, isLoading } = useOrgMembership()

  // Gate: only trainer staff get in. End-users get bounced to dashboard.
  useEffect(() => {
    if (isLoading) return
    if (!membership) navigate('/dashboard')
  }, [membership, isLoading, navigate])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    )
  }
  if (!membership) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="font-semibold">{org?.branding?.app_name ?? org?.name ?? 'Trainer'}</div>
            <span className="text-xs text-muted-foreground">Trainer console</span>
          </div>
          <nav className="hidden md:flex gap-1 text-sm">
            {links.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-semibold mb-6">{title}</h1>
        {children}
      </main>
    </div>
  )
}
