import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { Json } from "@/lib/database.types";
import {
  sendBuyerOrderConfirmationEmail,
  sendSellerNewOrderEmail,
} from "@/lib/order-emails";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const headerList = await headers();
  const signature = headerList.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !secret) {
    return NextResponse.json(
      { error: "Missing webhook config" },
      { status: 500 }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    try {
      await fulfillOrder(session);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Fulfillment failed";
      console.error("Stripe fulfill error:", message);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

async function fulfillOrder(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") {
    return;
  }

  const admin = createServiceRoleClient();
  const sessionId = session.id;
  const totalPaid =
    session.amount_total != null ? session.amount_total / 100 : 0;

  const { data: existingOrder } = await admin
    .from("orders")
    .select("id, buyer_id, locker_id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();

  if (existingOrder) {
    const { data: oi } = await admin
      .from("order_items")
      .select("item_id")
      .eq("order_id", existingOrder.id);
    const ids = oi?.map((x) => x.item_id) ?? [];
    if (ids.length) {
      await admin
        .from("items")
        .update({ sold: true })
        .in("id", ids)
        .eq("locker_id", existingOrder.locker_id)
        .eq("sold", false);
    }
    return;
  }

  const expectedCents = session.metadata?.expected_total_cents;
  if (
    expectedCents &&
    session.amount_total != null &&
    Number(expectedCents) !== session.amount_total
  ) {
    throw new Error("Amount mismatch for checkout session");
  }

  const m = session.metadata;
  const buyerId = m?.buyer_id;
  const lockerId = m?.locker_id;
  if (!buyerId || !lockerId) {
    throw new Error("Missing buyer_id or locker_id in session metadata");
  }

  if (
    session.client_reference_id &&
    session.client_reference_id !== buyerId
  ) {
    throw new Error("Checkout client_reference_id does not match buyer");
  }

  const itemIds = readItemIdsFromSessionMetadata(m);
  if (itemIds.length === 0) {
    throw new Error("No item_ids in session metadata");
  }

  const { data: itemRows, error: itemsLoadError } = await admin
    .from("items")
    .select("id, locker_id, sold, price, number, name")
    .in("id", itemIds)
    .eq("locker_id", lockerId);

  if (itemsLoadError || !itemRows?.length || itemRows.length !== itemIds.length) {
    throw new Error("Items invalid for fulfillment");
  }

  for (const row of itemRows) {
    if (row.sold) {
      throw new Error("An item was already sold");
    }
  }

  const { data: lockerRow, error: lockerErr } = await admin
    .from("lockers")
    .select("number, nickname, shipping_rate, seller_id")
    .eq("id", lockerId)
    .maybeSingle();

  if (lockerErr || !lockerRow) {
    throw new Error("Locker not found for fulfillment");
  }

  const subtotal = roundMoney(
    itemRows.reduce((s, r) => s + Number(r.price), 0)
  );
  const platformFee = roundMoney(subtotal * 0.1);

  if (session.amount_total == null) {
    throw new Error("Missing payment amount");
  }

  const shippingAddress = buildShippingAddress(session);

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
      buyer_id: buyerId,
      locker_id: lockerId,
      total: totalPaid,
      stripe_checkout_session_id: sessionId,
      platform_fee: platformFee,
      shipping_address: (shippingAddress ?? null) as Json,
    })
    .select("id")
    .single();

  if (orderError || !order) {
    throw new Error(orderError?.message ?? "Order insert failed");
  }

  const orderItemRows = itemIds.map((itemId) => ({
    order_id: order.id,
    item_id: itemId,
  }));

  const { error: oiError } = await admin.from("order_items").insert(orderItemRows);

  if (oiError) {
    await admin.from("orders").delete().eq("id", order.id);
    throw new Error(oiError.message);
  }

  const { data: marked, error: markError } = await admin
    .from("items")
    .update({ sold: true })
    .in("id", itemIds)
    .eq("locker_id", lockerId)
    .eq("sold", false)
    .select("id");

  if (markError || !marked || marked.length !== itemIds.length) {
    throw new Error("Could not mark items as sold");
  }

  const [{ data: buyerUser }, { data: sellerUser }] = await Promise.all([
    admin.from("users").select("email").eq("id", buyerId).maybeSingle(),
    admin
      .from("users")
      .select("email")
      .eq("id", lockerRow.seller_id)
      .maybeSingle(),
  ]);

  const emailItems = itemRows.map((r) => ({
    number: Number(r.number),
    name: r.name ?? null,
    price: Number(r.price),
  }));
  const shippingTotal = roundMoney(Number(lockerRow.shipping_rate));

  if (buyerUser?.email) {
    void sendBuyerOrderConfirmationEmail({
      to: buyerUser.email,
      lockerNickname: lockerRow.nickname,
      lockerNumber: lockerRow.number,
      items: emailItems,
      shippingTotal,
      orderTotal: totalPaid,
    }).catch((err) =>
      console.error("Buyer confirmation email promise rejected:", err)
    );
  }

  if (sellerUser?.email) {
    void sendSellerNewOrderEmail({
      to: sellerUser.email,
      items: emailItems,
      shippingAddress,
      orderTotal: totalPaid,
    }).catch((err) =>
      console.error("Seller notification email promise rejected:", err)
    );
  }
}

const ITEM_ID_METADATA_KEYS = [
  "item_ids",
  "item_ids_2",
  "item_ids_3",
  "item_ids_4",
  "item_ids_5",
] as const;

function readItemIdsFromSessionMetadata(
  m: Record<string, string> | null | undefined
): string[] {
  if (!m) {
    return [];
  }
  const out: string[] = [];
  for (const k of ITEM_ID_METADATA_KEYS) {
    const v = m[k];
    if (v) {
      out.push(
        ...v
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      );
    }
  }
  return out;
}

function buildShippingAddress(
  session: Stripe.Checkout.Session
): Record<string, unknown> | null {
  const collected = session.collected_information?.shipping_details;
  const legacy = (
    session as Stripe.Checkout.Session & {
      shipping_details?: {
        name?: string | null;
        address?: Pick<
          NonNullable<Stripe.Address>,
          "line1" | "line2" | "city" | "state" | "postal_code" | "country"
        > | null;
      } | null;
    }
  ).shipping_details;
  const sd = collected ?? legacy;
  if (!sd?.address) {
    return null;
  }
  const a = sd.address;
  return {
    name: sd.name ?? null,
    line1: a.line1 ?? null,
    line2: a.line2 ?? null,
    city: a.city ?? null,
    state: a.state ?? null,
    postal_code: a.postal_code ?? null,
    country: a.country ?? null,
  };
}
