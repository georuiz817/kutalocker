import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { getPublicSiteUrl, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

function onboardingUrls() {
  const base = getPublicSiteUrl();
  return {
    return_url: `${base}/dashboard?connect=success`,
    refresh_url: `${base}/dashboard?connect=refresh`,
  };
}

/** GET starts or resumes Stripe Connect Express onboarding. */
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
      { error: "Only sellers can set up payouts" },
      { status: 403 },
    );
  }

  try {
    const stripe = getStripe();
    const admin = createServiceRoleClient();
    const { refresh_url, return_url } = onboardingUrls();

    let accountId =
      typeof profile?.stripe_account_id === "string" &&
      profile.stripe_account_id.trim().length > 0
        ? profile.stripe_account_id.trim()
        : null;

    if (!accountId) {
      const country =
        process.env.STRIPE_CONNECT_ACCOUNT_COUNTRY?.trim() || "US";
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email ?? undefined,
        country,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      accountId = account.id;

      const { error: saveErr } = await admin
        .from("users")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);

      if (saveErr) {
        console.error("Failed to persist stripe_account_id:", saveErr);
        return NextResponse.json(
          { error: "Could not save Stripe account. Try again." },
          { status: 500 },
        );
      }
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url,
      return_url,
      type: "account_onboarding",
    });

    const url = accountLink.url;
    if (!url) {
      return NextResponse.json(
        { error: "Stripe did not return an onboarding URL" },
        { status: 502 },
      );
    }

    return NextResponse.redirect(url, 303);
  } catch (err) {
    console.error("[connect/onboard]", err);
    const message =
      err instanceof Error ? err.message : "Stripe Connect onboarding failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
