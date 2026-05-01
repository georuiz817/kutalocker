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

  const orderList = orders ?? [];

  return (
    <main className="page-shell dashboard-page">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>Profile & orders</h1>
          <p className="muted">
            Manage your sign-in details and review past purchases.
          </p>
        </div>
        <Link className="button-link" href="/">
          Back to shop
        </Link>
      </header>

      <section className="dashboard-orders" aria-labelledby="account-profile-title">
        <h2 className="dashboard-orders-title" id="account-profile-title">
          Profile
        </h2>
        <p className="muted small dashboard-orders-lead">
          Email and password for this account.
        </p>

        <div className="panel seller-order-card dashboard-payout-card">
          <p className="muted">
            Email: <span className="mono">{email}</span>
          </p>
          <AccountPasswordForm email={email} />
        </div>
      </section>

      <section className="dashboard-orders" aria-labelledby="account-orders-title">
        <h2 className="dashboard-orders-title" id="account-orders-title">
          Order history
        </h2>
        <p className="muted small dashboard-orders-lead">
          Items and totals from your completed checkouts.
        </p>

        {!orderList.length ? (
          <div className="panel empty-state dashboard-orders-empty">
            <p className="muted">You have not placed an order yet.</p>
          </div>
        ) : (
          <BuyerOrderHistorySection orders={orderList} />
        )}
      </section>
    </main>
  );
}
