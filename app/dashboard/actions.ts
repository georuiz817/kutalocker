"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

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
