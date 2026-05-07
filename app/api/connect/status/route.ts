import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** GET JSON: { charges_enabled: boolean } for the authenticated seller's Connect account */
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
      { error: "Only sellers have Connect status" },
      { status: 403 },
    );
  }

  const stripeAccountId = profile.stripe_account_id?.trim();
  if (!stripeAccountId) {
    return NextResponse.json({ charges_enabled: false });
  }

  try {
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(stripeAccountId);
    return NextResponse.json({
      charges_enabled: account.charges_enabled === true,
    });
  } catch (err) {
    console.error("[connect/status]", err);
    return NextResponse.json(
      { error: "Could not load Stripe account" },
      { status: 502 },
    );
  }
}
