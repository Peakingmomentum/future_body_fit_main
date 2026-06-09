import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Price mapping - these will be replaced with actual Stripe price IDs
const PRICE_MAP: Record<string, { amount: number; interval: Stripe.PriceCreateParams.Recurring.Interval | null; intervalCount?: number }> = {
  weekly: { amount: 500, interval: "week" },
  monthly: { amount: 1500, interval: "month" },
  yearly: { amount: 9900, interval: "year" },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe is not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
    });

    const { planId, userId } = await req.json();

    if (!planId || !PRICE_MAP[planId]) {
      throw new Error("Invalid plan selected");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, stripe_customer_id")
      .eq("user_id", userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    // Create or get Stripe customer
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: profile?.email,
        metadata: { userId },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", userId);
    }

    const planConfig = PRICE_MAP[planId];
    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `FitFuture ${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
              description: `${planId === 'yearly' ? 'Best value - ' : ''}Full access to AI transformation, workouts, and nutrition tracking`,
            },
            unit_amount: planConfig.amount,
            recurring: planConfig.interval ? {
              interval: planConfig.interval,
            } : undefined,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?success=true`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        userId,
        planId,
      },
    });

    return new Response(
      JSON.stringify({ url: session.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
