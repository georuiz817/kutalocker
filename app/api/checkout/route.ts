import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { getPublicSiteUrl, getStripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

const SHIPPING_COUNTRIES = [
  "US", "CA", "GB", "AU", "DE", "FR", "IT", "ES", "NL", "BE", "AT", "CH",
  "IE", "SE", "NO", "DK", "FI", "NZ", "JP", "SG", "HK", "MX", "BR", "IN", "KR",
] as const;

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

function toCents(amount: number) {
  return Math.round(amount * 100);
}

/** Stripe metadata value max 500 chars; use multiple keys if needed */
const STRIPE_METADATA_VALUE_MAX = 500;
const ITEM_ID_METADATA_KEYS = [
  "item_ids",
  "item_ids_2",
  "item_ids_3",
  "item_ids_4",
  "item_ids_5",
] as const;

function buildItemIdMetadata(
  itemIds: string[]
): Record<string, string> | null {
  if (itemIds.length === 0) {
    return { item_ids: "" };
  }
  const out: Record<string, string> = {};
  let keyIdx = 0;
  let i = 0;
  while (i < itemIds.length) {
    if (keyIdx >= ITEM_ID_METADATA_KEYS.length) {
      return null;
    }
    const parts: string[] = [itemIds[i]!];
    i += 1;
    while (i < itemIds.length) {
      const next = `${parts.join(",")},${itemIds[i]}`;
      if (next.length > STRIPE_METADATA_VALUE_MAX) {
        break;
      }
      parts.push(itemIds[i]!);
      i += 1;
    }
    out[ITEM_ID_METADATA_KEYS[keyIdx]!] = parts.join(",");
    keyIdx += 1;
  }
  return out;
}

export async function POST(request: Request) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            /* session refresh not needed in route response */
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "buyer") {
      return NextResponse.json(
        { error: "Only buyers can start checkout" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      itemIds?: string[];
      lockerId?: string;
    };

    const { itemIds, lockerId } = body;
    if (!Array.isArray(itemIds) || itemIds.length === 0 || !lockerId) {
      return NextResponse.json(
        { error: "Missing itemIds or lockerId" },
        { status: 400 }
      );
    }

    const { data: locker, error: lockerError } = await supabase
      .from("lockers")
      .select("*")
      .eq("id", lockerId)
      .eq("state", "active")
      .maybeSingle();

    if (lockerError || !locker) {
      return NextResponse.json(
        { error: "Locker not available for checkout" },
        { status: 400 }
      );
    }

    const { data: itemRows, error: itemsError } = await supabase
      .from("items")
      .select("*")
      .in("id", itemIds)
      .eq("locker_id", lockerId);

    if (itemsError || !itemRows?.length) {
      return NextResponse.json(
        { error: "Could not load items for checkout" },
        { status: 400 }
      );
    }

    if (itemRows.length !== itemIds.length) {
      return NextResponse.json(
        { error: "Some items are invalid" },
        { status: 400 }
      );
    }

    for (const row of itemRows) {
      if (row.sold) {
        return NextResponse.json(
          { error: "An item in your cart is no longer available" },
          { status: 400 }
        );
      }
    }

    const subtotal = roundMoney(
      itemRows.reduce((s, r) => s + Number(r.price), 0)
    );
    const platformFee = roundMoney(subtotal * 0.1);
    const shipping = roundMoney(Number(locker.shipping_rate));
    const total = roundMoney(subtotal + platformFee + shipping);
    const expectedCents = toCents(total);

    const itemIdMetadata = buildItemIdMetadata(itemIds);
    if (itemIdMetadata === null) {
      return NextResponse.json(
        { error: "Cart is too large for checkout (try fewer items at once)" },
        { status: 400 }
      );
    }

    const site = getPublicSiteUrl();
    const stripe = getStripe();

    const lineItems = [
      ...itemRows.map((item) => {
        const name = item.name?.trim()
          ? item.name
          : `Item #${item.number}`;
        return {
          price_data: {
            currency: "usd",
            product_data: { name },
            unit_amount: toCents(Number(item.price)),
          },
          quantity: 1,
        };
      }),
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Platform fee" },
          unit_amount: toCents(platformFee),
        },
        quantity: 1,
      },
      {
        price_data: {
          currency: "usd",
          product_data: { name: "Shipping" },
          unit_amount: toCents(shipping),
        },
        quantity: 1,
      },
    ];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      success_url: `${site}/order/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/cart`,
      line_items: lineItems,
      shipping_address_collection: {
        allowed_countries: [...SHIPPING_COUNTRIES],
      },
      metadata: {
        buyer_id: user.id,
        locker_id: lockerId,
        expected_total_cents: String(expectedCents),
        ...itemIdMetadata,
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a checkout URL" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
