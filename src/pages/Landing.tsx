import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useOrg } from '@/contexts/OrgContext';
import { 
  Zap, 
  Target, 
  TrendingUp, 
  Dumbbell, 
  Apple, 
  Camera,
  Check,
  ArrowRight,
  ArrowDown,
  Sparkles,
  MessageCircle,
  Smile,
  Flame,
  Shield,
  Scale,
  Send
} from 'lucide-react';
import heroTransformationDay1 from '@/assets/hero-transformation-day1.jpg';
import heroTransformationGoal from '@/assets/hero-transformation-goal.jpg';
import heroTransformationHarold from '@/assets/hero-transformation-harold.jpg';
import heroTransformationHaroldGoal from '@/assets/hero-transformation-harold-goal.jpg';

export default function Landing() {
  const { org } = useOrg();
  const branding = org?.branding ?? {};
  const appName = branding.app_name || 'Future Body Fit';
  const logoUrl = branding.logo_url;
  const tagline = branding.tagline;

  const features = [
    {
      icon: Camera,
      title: 'AI Body Transformation',
      description: 'See your future self with AI-generated transformation photos based on your goals',
    },
    {
      icon: Dumbbell,
      title: 'Smart Workout Plans',
      description: 'Get personalized AI-generated workouts tailored to your fitness level and goals',
    },
    {
      icon: Apple,
      title: 'Nutrition Tracking',
      description: 'Track calories, macros, and meals with smart suggestions aligned to your targets',
    },
    {
      icon: TrendingUp,
      title: 'Progress Dashboard',
      description: 'Visualize your journey with detailed charts, streaks, and achievement badges',
    },
  ];

  const plans = [
    {
      name: 'Weekly',
      price: '$5',
      period: '/week',
      description: 'Perfect for trying out',
      features: ['Full access to all features', 'AI body transformation', 'Unlimited workout plans', 'Nutrition tracking'],
    },
    {
      name: 'Monthly',
      price: '$15',
      period: '/month',
      description: 'Most popular choice',
      features: ['Everything in Weekly', 'Save 25% vs weekly', 'Priority AI processing', 'Email support'],
      popular: true,
    },
    {
      name: 'Yearly',
      price: '$99',
      period: '/year',
      description: 'Best value',
      features: ['Everything in Monthly', 'Save 45% vs monthly', '2 months free', 'Priority support'],
    },
  ];

  return (
    <div className="min-h-screen bg-background dark">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-accent/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--neon)/0.15),transparent_50%)]" />
        
        <nav className="relative z-10 flex items-center justify-between p-6 max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="w-8 h-8 object-contain" />
            ) : (
              <Zap className="w-8 h-8 text-primary" />
            )}
            <span className="text-2xl font-display font-bold text-white">{appName}</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost" className="text-white hover:text-white/80">Sign In</Button>
            </Link>
            <Link to="/auth?mode=signup">
              <Button className="neon-glow">Get Started</Button>
            </Link>
          </div>
        </nav>

        <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI-Powered Fitness Transformation</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 leading-tight text-white">
                See Your
                <span className="text-gradient"> Future Body</span>
                <br />Before You Build It
              </h1>
              <p className="text-lg text-white/70 mb-8 max-w-xl">
                {tagline ||
                  'Upload a photo, set your goals, and watch AI reveal your transformation. Then let our smart workouts and nutrition tracking guide you there.'}
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/auth?mode=signup">
                  <Button size="lg" className="text-lg px-8 neon-glow">
                    Start Your Transformation
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right side - Transformation showcase */}
            <div className="relative">
              {/* PACE Mode badge */}
              <div className="absolute -top-2 right-4 md:right-8 z-20 px-4 py-2 rounded-xl bg-primary/90 text-primary-foreground font-semibold text-sm shadow-lg">
                PACE Mode
              </div>
              
              {/* Transformation images container */}
              <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-display font-semibold text-white">Your Transformation Journey</h3>
                </div>
                
                {/* Images stacked vertically */}
                <div className="flex flex-col items-center gap-3">
                  {/* Day 1 - START image */}
                  <div className="relative w-full max-w-[220px]">
                    <div className="absolute top-2 left-2 z-10 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                      START
                    </div>
                    <img 
                      src={heroTransformationDay1} 
                      alt="Day 1 starting point" 
                      className="w-full aspect-[3/4] object-cover rounded-xl border-2 border-primary/50"
                    />
                    <div className="text-center mt-2">
                      <p className="font-semibold text-white">Day 1</p>
                      <p className="text-sm text-muted-foreground">265 lbs</p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowDown className="w-5 h-5 text-white/40" />

                  {/* Goal - AI generated */}
                  <div className="relative w-full max-w-[220px]">
                    <div className="absolute top-2 left-2 z-10 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      GOAL
                    </div>
                    <img 
                      src={heroTransformationGoal} 
                      alt="AI-generated goal preview" 
                      className="w-full aspect-[3/4] object-cover rounded-xl border-2 border-primary/70"
                    />
                    <div className="text-center mt-2">
                      <p className="font-semibold text-primary">Week 12</p>
                      <p className="text-sm text-muted-foreground">245 lbs</p>
                    </div>
                  </div>
                </div>

                {/* Caption */}
                <p className="text-center text-sm text-muted-foreground mt-4 italic">
                  See your AI-powered transformation journey
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4 text-white">
              Everything You Need to Transform
            </h2>
            <p className="text-xl text-white/70 max-w-2xl mx-auto">
              Powered by AI, designed for results. Your complete fitness companion.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="glass border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* AI Fitness Buddy Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-background to-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Text content */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <MessageCircle className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI-Powered Coaching</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-white">
                Your Personal
                <span className="text-gradient"> AI Fitness Buddy</span>
              </h2>
              <p className="text-lg text-white/70 mb-8">
                Get instant answers to all your fitness and nutrition questions. Choose from different coaching personalities that match your style - from calm and supportive to intense drill sergeant motivation.
              </p>
              
              {/* Personality badges */}
              <div className="flex flex-wrap gap-3 mb-8">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30">
                  <Smile className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-white">Calm Mentor</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30">
                  <Flame className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-white">Hype Coach</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-destructive/20 border border-destructive/30">
                  <Shield className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-medium text-white">Drill Sergeant</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary border border-border">
                  <Scale className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-white">Balanced</span>
                </div>
              </div>

              <Link to="/auth?mode=signup">
                <Button size="lg" className="neon-glow">
                  Try AI Fitness Buddy
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>

            {/* Right side - Mock chat interface */}
            <div className="relative">
              <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 overflow-hidden shadow-2xl">
                {/* Chat header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-primary" />
                    <span className="font-semibold text-white">AI Fitness Buddy</span>
                  </div>
                  <div className="flex gap-2">
                    <div className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center gap-1">
                      <Smile className="w-3 h-3" />
                      Calm
                    </div>
                  </div>
                </div>

                {/* Chat messages */}
                <div className="p-4 space-y-4 min-h-[300px]">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground px-4 py-2 rounded-2xl rounded-tr-md max-w-[80%]">
                      <p className="text-sm">What sugars should I cut out for a low sugar heavy lift diet?</p>
                    </div>
                  </div>

                  {/* AI response */}
                  <div className="flex justify-start">
                    <div className="bg-secondary/80 px-4 py-3 rounded-2xl rounded-tl-md max-w-[90%]">
                      <p className="text-sm text-white/90 mb-2">
                        It's wonderful that you're looking to fuel your body more intentionally for your lifting. The "low sugar, heavy lift" approach focuses on stable energy and muscle recovery.
                      </p>
                      <p className="text-sm font-semibold text-white mb-1">Sugars to Minimize:</p>
                      <ul className="text-sm text-white/80 space-y-1">
                        <li>• <strong>Added Sugars:</strong> Found in sodas, sweetened coffees</li>
                        <li>• <strong>Refined Sugars:</strong> White breads, pastries</li>
                        <li>• <strong>High-Fructose Corn Syrup:</strong> Hidden in "health bars"</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Chat input */}
                <div className="p-4 border-t border-border/50">
                  <div className="flex items-center gap-2 bg-secondary/50 rounded-xl px-4 py-3">
                    <span className="text-muted-foreground text-sm flex-1">Ask your fitness buddy...</span>
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                      <Send className="w-4 h-4 text-primary-foreground" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* Secondary PACE Mode Example */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left side - Transformation showcase */}
            <div className="relative order-2 lg:order-1">
              <div className="absolute -top-2 right-4 md:right-8 z-20 px-4 py-2 rounded-xl bg-primary/90 text-primary-foreground font-semibold text-sm shadow-lg">
                PACE Mode
              </div>
              
              <div className="relative bg-card/50 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-display font-semibold text-white">Your Transformation Journey</h3>
                </div>
                
                {/* Stacked vertically */}
                <div className="flex flex-col items-center gap-3">
                  {/* AI Milestone */}
                  <div className="relative w-full max-w-[220px]">
                    <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
                      <Sparkles className="w-3 h-3" />
                      AI
                    </div>
                    <img 
                      src={heroTransformationHarold} 
                      alt="Week 4 AI prediction" 
                      className="w-full aspect-[3/4] object-cover rounded-xl border-2 border-primary/50"
                    />
                    <div className="text-center mt-2">
                      <p className="font-semibold text-sm text-white">Week 4</p>
                      <p className="text-xs text-muted-foreground">240 lbs target</p>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ArrowDown className="w-5 h-5 text-primary/50" />

                  {/* Goal */}
                  <div className="relative w-full max-w-[220px]">
                    <div className="absolute top-2 left-2 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-medium">
                      <Sparkles className="w-3 h-3" />
                      GOAL
                    </div>
                    <img 
                      src={heroTransformationHaroldGoal} 
                      alt="Week 12 Goal transformation" 
                      className="w-full aspect-[3/4] object-cover rounded-xl border-2 border-primary/50"
                    />
                    <div className="text-center mt-2">
                      <p className="font-semibold text-sm text-primary">Week 12</p>
                      <p className="text-xs text-muted-foreground">230 lbs</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -top-4 -left-4 w-24 h-24 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-accent/10 rounded-full blur-3xl" />
            </div>

            {/* Right side - Text content */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-primary">AI PACE Mode</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-display font-bold mb-6 text-white">
                Weekly AI Milestones
                <span className="text-gradient"> Keep You on Track</span>
              </h2>
              <p className="text-lg text-white/70 mb-6">
                PACE Mode generates weekly AI previews of your progress, showing you what's possible if you stay consistent. Each milestone is personalized to your body and goals.
              </p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-white/80">Weekly AI-generated progress previews</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-white/80">Personalized weight & body composition targets</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center mt-0.5">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-white/80">Compare your real photos with AI predictions</span>
                </li>
              </ul>

              <Link to="/auth?mode=signup">
                <Button size="lg" className="neon-glow">
                  Try PACE Mode Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-secondary/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground">
              Three simple steps to your transformation
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Upload Your Photo', desc: 'Take a current photo and tell us your fitness goals' },
              { step: '02', title: 'See Your Future', desc: 'AI generates your transformation preview - free!' },
              { step: '03', title: 'Start Training', desc: 'Subscribe to unlock workouts and nutrition to get there' },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="text-6xl font-display font-bold text-primary/20 mb-4">{item.step}</div>
                <h3 className="text-2xl font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6" id="pricing">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-muted-foreground">
              Choose the plan that fits your journey
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`relative ${plan.popular ? 'border-primary neon-border' : 'border-border'}`}
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
                    <span className="text-5xl font-display font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <Check className="w-5 h-5 text-primary" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth?mode=signup">
                    <Button 
                      className="w-full" 
                      variant={plan.popular ? 'default' : 'outline'}
                    >
                      Get Started
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Ready to Meet Your Future Self?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands transforming their bodies with AI-powered fitness
          </p>
          <Link to="/auth?mode=signup">
            <Button size="lg" className="text-lg px-12 neon-glow animate-pulse-glow">
              Start Free Transformation
              <Sparkles className="ml-2 w-5 h-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 bg-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt={appName} className="w-6 h-6 object-contain" />
            ) : (
              <Zap className="w-6 h-6 text-primary" />
            )}
            <span className="text-xl font-display font-bold text-white">{appName}</span>
          </div>
          <p className="text-white/50 text-sm">
            © 2024 {appName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
