"use server";

import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { sendBuyerOrderShippedEmail, type OrderEmailLineItem } from "@/lib/order-emails";
import { isOrderCarrier } from "@/lib/tracking";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type DeleteLockerState = { error: string | null };

export type UpdateOrderTrackingState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | null;

export async function updateOrderTrackingAction(
  _prev: UpdateOrderTrackingState | null,
  formData: FormData,
): Promise<UpdateOrderTrackingState> {
  const rawOrderId = formData.get("orderId");
  const orderId =
    typeof rawOrderId === "string" ? rawOrderId.trim() : "";
  const trackingNumber = String(
    formData.get("trackingNumber") ?? "",
  ).trim();
  const carrierRaw = String(formData.get("carrier") ?? "").trim();

  console.log("[updateOrderTracking] invoked", {
    orderId: orderId || "(empty)",
    carrier: carrierRaw || "(empty)",
    trackingLen: trackingNumber.length,
  });

  if (!orderId) {
    return { ok: false, error: "Missing order." };
  }
  if (!trackingNumber) {
    return { ok: false, error: "Enter a tracking number." };
  }
  if (!isOrderCarrier(carrierRaw)) {
    return { ok: false, error: "Choose a carrier." };
  }
  const carrier = carrierRaw;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "seller") {
    return { ok: false, error: "Only sellers can add tracking." };
  }

  const admin = createServiceRoleClient();

  type OrderSellerRow = {
    id: string;
    buyer_id: string;
    tracking_number: string | null;
    carrier: string | null;
    lockers: {
      seller_id: string;
      nickname: string;
      number: number;
    } | null;
    order_items: {
      item_id: string;
      items: { number: number; name: string | null; price: number } | null;
    }[] | null;
  };

  const { data: orderRow, error: fetchErr } = await admin
    .from("orders")
    .select(
      `
      id,
      buyer_id,
      tracking_number,
      carrier,
      lockers!inner (
        seller_id,
        nickname,
        number
      ),
      order_items (
        item_id,
        items ( number, name, price )
      )
    `,
    )
    .eq("id", orderId)
    .maybeSingle();

  const row = orderRow as OrderSellerRow | null;

  if (fetchErr || !row?.lockers) {
    console.error("[updateOrderTracking] order fetch failed", {
      orderId,
      fetchErr: fetchErr?.message ?? fetchErr,
      hasRow: Boolean(row),
      hasLocker: Boolean(row?.lockers),
    });
    return { ok: false, error: "Order not found." };
  }

  if (row.lockers.seller_id !== user.id) {
    return { ok: false, error: "You can’t update this order." };
  }

  const { error: updErr } = await admin
    .from("orders")
    .update({
      tracking_number: trackingNumber,
      carrier,
    })
    .eq("id", orderId);

  if (updErr) {
    console.error("[updateOrderTracking] Supabase update failed", {
      orderId,
      message: updErr.message,
    });
    return { ok: false, error: updErr.message };
  }

  console.log("[updateOrderTracking] tracking row saved OK", {
    orderId,
    buyer_id: row.buyer_id,
  });

  const { data: buyerRow, error: buyerEmailErr } = await admin
    .from("users")
    .select("email")
    .eq("id", row.buyer_id)
    .maybeSingle();

  console.log("[updateOrderTracking] buyer email fetch result", {
    orderId,
    buyer_id: row.buyer_id,
    hasBuyerRow: Boolean(buyerRow),
    emailPresent: Boolean(buyerRow?.email?.trim()),
    queryError: buyerEmailErr?.message ?? null,
  });

  if (buyerEmailErr) {
    console.error("[updateOrderTracking] buyer users query error", buyerEmailErr);
  }

  const items: OrderEmailLineItem[] = [];
  for (const r of row.order_items ?? []) {
    const it = r.items;
    if (it) {
      items.push({
        number: it.number,
        name: it.name,
        price: Number(it.price),
      });
    }
  }

  if (buyerRow?.email) {
    console.log("[updateOrderTracking] calling sendBuyerOrderShippedEmail", {
      orderId,
      to: buyerRow.email,
      itemCount: items.length,
      hasResendKey: Boolean(process.env.RESEND_API_KEY),
    });
    try {
      await sendBuyerOrderShippedEmail({
        to: buyerRow.email,
        carrier,
        trackingNumber,
        items,
        lockerNickname: row.lockers.nickname,
        lockerNumber: row.lockers.number,
      });
      console.log(
        "[updateOrderTracking] sendBuyerOrderShippedEmail await finished",
        { orderId },
      );
    } catch (emailErr) {
      console.error(
        "[updateOrderTracking] sendBuyerOrderShippedEmail threw",
        emailErr,
      );
    }
  } else {
    console.warn(
      "[updateOrderTracking] no buyer email; skipped shipment notification",
      { orderId, buyer_id: row.buyer_id, buyerRow: buyerRow ?? null },
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/account");

  return { ok: true, message: "Tracking saved." };
}

export async function deleteLockerAction(
  _prevState: DeleteLockerState,
  formData: FormData
): Promise<DeleteLockerState> {
  const lockerId = formData.get("lockerId");
  if (typeof lockerId !== "string" || !lockerId) {
    return { error: "Invalid request." };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: locker, error: lockerErr } = await supabase
    .from("lockers")
    .select("id, seller_id")
    .eq("id", lockerId)
    .maybeSingle();

  if (lockerErr || !locker || locker.seller_id !== user.id) {
    return { error: "Locker not found." };
  }

  const admin = createServiceRoleClient();
  const { count, error: countErr } = await admin
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("locker_id", lockerId);

  if (countErr) {
    return { error: countErr.message };
  }
  if ((count ?? 0) > 0) {
    return {
      error:
        "This locker has orders and can’t be deleted. Historical orders must stay on record.",
    };
  }

  const { error: delErr } = await admin
    .from("lockers")
    .delete()
    .eq("id", lockerId)
    .eq("seller_id", user.id);

  if (delErr) {
    return { error: delErr.message };
  }

  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect("/dashboard");
}
