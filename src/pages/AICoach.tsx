import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { FitnessBuddyChat } from '@/components/FitnessBuddyChat';
import { AppNav } from '@/components/AppNav';
import { Loader2 } from 'lucide-react';

export default function AICoach() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background dark flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background dark">
      <AppNav />
      <div className="relative p-4 sm:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5 pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <FitnessBuddyChat />
        </div>
      </div>
    </div>
  );
}
