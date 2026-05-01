import Link from "next/link";
import { redirect } from "next/navigation";
import AccountPasswordForm from "@/components/AccountPasswordForm";
import BuyerOrderHistorySection from "@/components/BuyerOrderHistorySection";
import { createClient } from "@/lib/supabase/server";

export default async function AccountPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/account");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "buyer") {
    redirect("/");
  }

  const email = user.email ?? "";

  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id,
      total,
      created_at,
      lockers ( number, nickname ),
      order_items (
        item_id,
        items ( number, name, price )
      )
    `
    )
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="page-shell orders-page">
      <div className="orders-list">
        <div className="orders-card panel">
          <div className="orders-card-header">
            <p className="orders-locker-nick">Profile</p>
          </div>
          <p className="muted">
            Email on file: <span className="mono">{email}</span>
          </p>
          <AccountPasswordForm email={email} />
        </div>

        <div className="orders-card panel">
          <div className="orders-card-header">
            <p className="orders-locker-nick">Order History</p>
          </div>
          <BuyerOrderHistorySection orders={orders ?? []} />
        </div>
      </div>

      <p>
        <Link className="text-link" href="/">
          Back to shop
        </Link>
      </p>
    </main>
  );
}
