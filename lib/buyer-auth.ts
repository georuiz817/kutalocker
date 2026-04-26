import { createClient } from "@/lib/supabase";

export type BuyerAuthResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "not_logged_in" | "not_buyer" };

export async function getBuyerAuth(): Promise<BuyerAuthResult> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, reason: "not_logged_in" };
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "buyer") {
    return { ok: false, reason: "not_buyer" };
  }

  return { ok: true, userId: user.id };
}
