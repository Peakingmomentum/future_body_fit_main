import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Dumbbell, Sparkles, Apple, MessageCircle, LayoutDashboard } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
  { label: 'Workout Hub', path: '/workouts', icon: Dumbbell },
  { label: 'Transformation', path: '/transformation', icon: Sparkles },
  { label: 'Nutrition', path: '/nutrition', icon: Apple },
  { label: 'AI Coach', path: '/ai-coach', icon: MessageCircle },
];

export function AppNav() {
  const location = useLocation();

  return (
    <nav className="w-full border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 h-12 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
