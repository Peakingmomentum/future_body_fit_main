import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { OrgProvider } from "@/contexts/OrgContext";
import { ThemeProvider } from "@/contexts/ThemeProvider";
import { ReferralAttribution } from "@/contexts/ReferralAttribution";
import { initPurchases } from "@/services/purchases";
import { isNative } from "@/lib/platform";
import Landing from "./pages/Landing";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import Transformation from "./pages/Transformation";
import DemoPreview from "./pages/DemoPreview";
import Pricing from "./pages/Pricing";
import Dashboard from "./pages/Dashboard";
import Workouts from "./pages/Workouts";
import AICoach from "./pages/AICoach";
import Nutrition from "./pages/Nutrition";
import Community from "./pages/Community";
import AffiliateRedirect from "./pages/AffiliateRedirect";
import NotFound from "./pages/NotFound";
import TrainerDashboard from "./pages/trainer/TrainerDashboard";
import TrainerBranding from "./pages/trainer/TrainerBranding";
import TrainerLibrary from "./pages/trainer/TrainerLibrary";
import TrainerMeals from "./pages/trainer/TrainerMeals";
import TrainerCommunity from "./pages/trainer/TrainerCommunity";
import TrainerAffiliate from "./pages/trainer/TrainerAffiliate";

const queryClient = new QueryClient();

const AppContent = () => {
  useEffect(() => {
    if (isNative()) {
      initPurchases().catch(console.error);
    }
  }, []);

  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <OrgProvider>
      <ThemeProvider>
      <ReferralAttribution>
      <TooltipProvider>
        <AppContent />
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/transformation" element={<Transformation />} />
            <Route path="/demo" element={<DemoPreview />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/workouts" element={<Workouts />} />
            <Route path="/ai-coach" element={<AICoach />} />
            <Route path="/nutrition" element={<Nutrition />} />
            <Route path="/community" element={<Community />} />
            <Route path="/r/:code" element={<AffiliateRedirect />} />
            <Route path="/trainer" element={<TrainerDashboard />} />
            <Route path="/trainer/branding" element={<TrainerBranding />} />
            <Route path="/trainer/library" element={<TrainerLibrary />} />
            <Route path="/trainer/meals" element={<TrainerMeals />} />
            <Route path="/trainer/community" element={<TrainerCommunity />} />
            <Route path="/trainer/affiliate" element={<TrainerAffiliate />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </ReferralAttribution>
      </ThemeProvider>
      </OrgProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
