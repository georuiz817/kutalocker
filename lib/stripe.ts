import Stripe from "stripe";

let stripe: Stripe | null = null;

function stripeLiveKeysAllowed() {
  const v = process.env.STRIPE_ALLOW_LIVE_KEYS;
  return v === "1" || v === "true";
}

/**
 * Enforces test keys (sk_test_ / pk_test_) unless STRIPE_ALLOW_LIVE_KEYS=1|true.
 * Test card: 4242 4242 4242 4242, any future expiry, any 3-digit CVC.
 */
function assertStripeKeyModesForTestMode() {
  if (stripeLiveKeysAllowed()) {
    return;
  }
  const sk = process.env.STRIPE_SECRET_KEY;
  if (sk) {
    if (sk.startsWith("sk_live_")) {
      throw new Error(
        "STRIPE_SECRET_KEY is a live secret. For test mode use sk_test_… (see .env.example). " +
          "To allow live keys, set STRIPE_ALLOW_LIVE_KEYS=true."
      );
    }
    if (!sk.startsWith("sk_test_")) {
      throw new Error(
        "STRIPE_SECRET_KEY must be a test secret (sk_test_…). " +
          "To use live keys, set STRIPE_ALLOW_LIVE_KEYS=true."
      );
    }
  }
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  if (pk) {
    if (pk.startsWith("pk_live_")) {
      throw new Error(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is a live key. For test mode use pk_test_…. " +
          "To allow live keys, set STRIPE_ALLOW_LIVE_KEYS=true."
      );
    }
    if (!pk.startsWith("pk_test_")) {
      throw new Error(
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must be a test key (pk_test_…) " +
          "or set STRIPE_ALLOW_LIVE_KEYS=true for live keys."
      );
    }
  }
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  assertStripeKeyModesForTestMode();
  if (!stripe) {
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-04-22.dahlia",
      typescript: true,
    });
  }
  return stripe;
}

export function getPublicSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}
