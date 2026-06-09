import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate webhook authorization
    const authHeader = req.headers.get("authorization");
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");

    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }

    const body = await req.json();
    const event = body.event;

    if (!event) {
      return new Response(JSON.stringify({ error: "No event in body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const appUserId = event.app_user_id;
    const eventType = event.type;
    const productId = event.product_id;

    console.log(`RevenueCat event: ${eventType} for user: ${appUserId}, product: ${productId}`);

    // Map product IDs to plan names
    const planFromProduct = (pid: string): string => {
      if (pid?.includes("weekly")) return "weekly";
      if (pid?.includes("monthly")) return "monthly";
      if (pid?.includes("yearly") || pid?.includes("annual")) return "yearly";
      return pid || "unknown";
    };

    switch (eventType) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "PRODUCT_CHANGE": {
        await supabase
          .from("profiles")
          .update({
            is_subscribed: true,
            subscription_status: "active",
            subscription_plan: planFromProduct(productId),
          })
          .eq("user_id", appUserId);
        break;
      }

      case "CANCELLATION":
      case "EXPIRATION": {
        await supabase
          .from("profiles")
          .update({
            is_subscribed: false,
            subscription_status: eventType === "CANCELLATION" ? "canceled" : "expired",
            subscription_plan: null,
          })
          .eq("user_id", appUserId);
        break;
      }

      case "BILLING_ISSUE": {
        await supabase
          .from("profiles")
          .update({
            subscription_status: "past_due",
          })
          .eq("user_id", appUserId);
        break;
      }

      default:
        console.log(`Unhandled RevenueCat event type: ${eventType}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("RevenueCat webhook error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
