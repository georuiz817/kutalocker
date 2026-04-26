"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { Database } from "@/lib/database.types";

type PayoutMethod = Database["public"]["Enums"]["payout_method"];

export type UpdatePayoutResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function updatePayoutInfo(
  _prev: UpdatePayoutResult | null,
  formData: FormData
): Promise<UpdatePayoutResult> {
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
    return { ok: false, error: "Only sellers can update payout information." };
  }

  const rawMethod = formData.get("payoutMethod");
  const method =
    rawMethod === "venmo" || rawMethod === "paypal"
      ? (rawMethod as PayoutMethod)
      : null;
  if (!method) {
    return { ok: false, error: "Choose Venmo or PayPal." };
  }

  const handle = String(formData.get("payoutHandle") ?? "").trim();
  const { error } = await supabase
    .from("users")
    .update({
      payout_method: method,
      payout_handle: handle.length > 0 ? handle : null,
    })
    .eq("id", user.id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true, message: "Payout information saved." };
}

async function freezeLockerById(lockerId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/");
  }

  const { error } = await supabase
    .from("lockers")
    .update({ state: "frozen" })
    .eq("id", lockerId)
    .eq("seller_id", user.id);

  if (error) {
    throw error;
  }

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/lockers/${lockerId}`);
}

export async function freezeLockerFromList(formData: FormData) {
  const lockerId = formData.get("lockerId");
  if (typeof lockerId !== "string" || !lockerId) {
    return;
  }

  await freezeLockerById(lockerId);
}

export async function freezeLockerFromEditPage(formData: FormData) {
  const lockerId = formData.get("lockerId");
  if (typeof lockerId !== "string" || !lockerId) {
    return;
  }

  await freezeLockerById(lockerId);
  redirect("/dashboard");
}
