import { Rocket, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { usePaceMilestones } from '@/hooks/usePaceMilestones';
import { useProfile } from '@/hooks/useProfile';
import { cn } from '@/lib/utils';

interface PaceStatusBadgeProps {
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function PaceStatusBadge({ className, showIcon = true, size = 'md' }: PaceStatusBadgeProps) {
  const { isPaceEnabled, currentWeek, programDurationWeeks, getPaceStatus } = usePaceMilestones();
  const { profile } = useProfile();

  if (!isPaceEnabled) {
    return null;
  }

  const paceStatus = getPaceStatus(profile?.current_weight ? Number(profile.current_weight) : null);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-sm px-3 py-1 gap-1.5',
    lg: 'text-base px-4 py-1.5 gap-2'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };

  const statusConfig = {
    'on-pace': {
      icon: Target,
      bgColor: 'bg-green-500/10',
      textColor: 'text-green-500',
      borderColor: 'border-green-500/30'
    },
    'ahead': {
      icon: TrendingUp,
      bgColor: 'bg-blue-500/10',
      textColor: 'text-blue-500',
      borderColor: 'border-blue-500/30'
    },
    'behind': {
      icon: TrendingDown,
      bgColor: 'bg-amber-500/10',
      textColor: 'text-amber-500',
      borderColor: 'border-amber-500/30'
    },
    'unknown': {
      icon: Rocket,
      bgColor: 'bg-primary/10',
      textColor: 'text-primary',
      borderColor: 'border-primary/30'
    }
  };

  const config = statusConfig[paceStatus.status];
  const Icon = config.icon;

  return (
    <div 
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        sizeClasses[size],
        config.bgColor,
        config.textColor,
        config.borderColor,
        className
      )}
    >
      {showIcon && <Icon className={iconSizes[size]} />}
      <span>Week {currentWeek}/{programDurationWeeks}</span>
      <span className="opacity-70">•</span>
      <span>{paceStatus.status === 'unknown' ? 'PACE Active' : paceStatus.message}</span>
    </div>
  );
}
