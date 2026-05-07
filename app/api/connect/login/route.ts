import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** GET redirects to the Stripe Express dashboard (Express login link). */
export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("stripe_account_id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seller") {
    return NextResponse.json(
      { error: "Only sellers can open the payout dashboard" },
      { status: 403 },
    );
  }

  const stripeAccountId = profile.stripe_account_id?.trim();
  if (!stripeAccountId) {
    return NextResponse.json(
      { error: "Set up payouts first" },
      { status: 400 },
    );
  }

  try {
    const stripe = getStripe();
    const link = await stripe.accounts.createLoginLink(stripeAccountId);
    const url = link.url;
    if (!url) {
      return NextResponse.json(
        { error: "Stripe did not return a dashboard URL" },
        { status: 502 },
      );
    }
    return NextResponse.redirect(url, 303);
  } catch (err) {
    console.error("[connect/login]", err);
    const message =
      err instanceof Error ? err.message : "Could not open Stripe dashboard";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
