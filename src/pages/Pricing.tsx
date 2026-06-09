import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Zap, Check, ArrowLeft, Loader2, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { isNative } from '@/lib/platform';
import {
  getOfferings,
  purchasePackage,
  restorePurchases,
  checkEntitlements,
} from '@/services/purchases';

const plans = [
  {
    id: 'weekly',
    name: 'Weekly',
    price: '$5',
    period: '/week',
    priceId: 'weekly',
    rcIdentifier: '$rc_weekly',
    description: 'Perfect for trying out',
    features: ['Full access to all features', 'AI body transformation', 'Unlimited workout plans', 'Nutrition tracking'],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$15',
    period: '/month',
    priceId: 'monthly',
    rcIdentifier: '$rc_monthly',
    description: 'Most popular choice',
    features: ['Everything in Weekly', 'Save 25% vs weekly', 'Priority AI processing', 'Email support'],
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$99',
    period: '/year',
    priceId: 'yearly',
    rcIdentifier: '$rc_annual',
    description: 'Best value',
    features: ['Everything in Monthly', 'Save 45% vs monthly', '2 months free', 'Priority support'],
  },
];

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [nativePackages, setNativePackages] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { profile } = useProfile();
  const native = isNative();

  // Load RevenueCat offerings on native
  useEffect(() => {
    if (!native) return;
    getOfferings()
      .then((offerings) => {
        if (offerings?.current?.availablePackages) {
          setNativePackages(offerings.current.availablePackages);
        }
      })
      .catch((err) => console.warn('Failed to load offerings:', err));
  }, [native]);

  const handleSubscribe = async (planId: string) => {
    if (!user) {
      navigate('/auth?mode=signup');
      return;
    }

    setLoading(planId);

    try {
      if (native && nativePackages) {
        // Native IAP via RevenueCat
        const plan = plans.find((p) => p.id === planId);
        const pkg = nativePackages.find(
          (p: any) =>
            p.identifier === plan?.rcIdentifier ||
            p.packageType?.toLowerCase().includes(planId)
        );

        if (!pkg) {
          throw new Error('Package not found in store. Please try again later.');
        }

        await purchasePackage(pkg);

        // Check entitlements after purchase
        const entitlements = await checkEntitlements();
        if (entitlements.isActive) {
          toast({ title: 'Success!', description: 'Your subscription is now active.' });
          navigate('/dashboard?success=true');
        }
      } else {
        // Web: Stripe checkout
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { planId, userId: user.id },
        });

        if (error) throw error;

        if (data?.url) {
          window.location.href = data.url;
        }
      }
    } catch (error: any) {
      // RevenueCat cancellation isn't an error
      if (error?.userCancelled) return;

      toast({
        title: 'Error',
        description: error.message || 'Failed to start checkout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  const handleRestore = async () => {
    setRestoring(true);
    try {
      const customerInfo = await restorePurchases();
      const hasActive = customerInfo?.entitlements?.active?.['pro_access'];

      if (hasActive) {
        toast({ title: 'Restored!', description: 'Your subscription has been restored.' });
        navigate('/dashboard');
      } else {
        toast({
          title: 'No active subscription',
          description: 'No previous purchases found to restore.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Restore failed',
        description: error.message || 'Could not restore purchases.',
        variant: 'destructive',
      });
    } finally {
      setRestoring(false);
    }
  };

  // Get store price if available, otherwise use default
  const getDisplayPrice = (plan: typeof plans[0]) => {
    if (!native || !nativePackages) return { price: plan.price, period: plan.period };

    const pkg = nativePackages.find(
      (p: any) =>
        p.identifier === plan.rcIdentifier ||
        p.packageType?.toLowerCase().includes(plan.id)
    );

    if (pkg?.product?.priceString) {
      return { price: pkg.product.priceString, period: plan.period };
    }
    return { price: plan.price, period: plan.period };
  };

  return (
    <div className="min-h-screen bg-background dark p-6">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/5" />

      <div className="relative max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Zap className="w-8 h-8 text-primary" />
            <span className="text-2xl font-display font-bold">FitFuture</span>
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-muted-foreground">
            Unlock your full transformation journey
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            const { price, period } = getDisplayPrice(plan);
            return (
              <Card
                key={plan.id}
                className={`relative ${plan.popular ? 'border-primary neon-border' : 'glass border-border/50'}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-sm font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                <CardContent className="p-8">
                  <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                  <p className="text-muted-foreground mb-4">{plan.description}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl font-display font-bold">{price}</span>
                    <span className="text-muted-foreground">{period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading === plan.id}
                  >
                    {loading === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Subscribe Now'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {native && (
          <div className="text-center mt-6">
            <Button
              variant="ghost"
              onClick={handleRestore}
              disabled={restoring}
              className="gap-2"
            >
              {restoring ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              Restore Purchases
            </Button>
          </div>
        )}

        <p className="text-center text-muted-foreground mt-8">
          Cancel anytime. No questions asked.
        </p>
      </div>
    </div>
  );
}
