import type { CSSProperties } from "react";
import { redirect } from "next/navigation";
import AccountPasswordForm from "@/components/AccountPasswordForm";
import BuyerOrderHistorySection from "@/components/BuyerOrderHistorySection";
import { pickRandomLockerPaletteHex } from "@/lib/locker-palette";
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
      tracking_number,
      carrier,
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
  const profileAccent = pickRandomLockerPaletteHex();
  const ordersAccent = pickRandomLockerPaletteHex();

  return (
    <main className="page-shell account-page">
      <header className="account-header">
        <div>
          <h1 className="account-title">Account</h1>
        </div>
      </header>

      <section
        className="account-section account-profile-section"
        aria-labelledby="account-profile-title"
        style={{
          backgroundColor: profileAccent,
          borderColor: profileAccent,
        }}
      >
        <h2 className="account-section-title" id="account-profile-title">
          Profile
        </h2>

        <div className="account-profile-card">
          <p className="account-email">
            Email: <span className="mono">{email}</span>
          </p>
          <AccountPasswordForm email={email} />
        </div>
      </section>

      <section
        className="account-section account-orders-section"
        aria-labelledby="account-orders-title"
        style={
          {
            "--account-orders-accent": ordersAccent,
            backgroundColor: ordersAccent,
            borderColor: ordersAccent,
          } as CSSProperties
        }
      >
        <h2 className="account-section-title" id="account-orders-title">
          Order history
        </h2>

        {!orderList.length ? (
          <div className="account-orders-empty">
            <p>You have not placed an order yet.</p>
          </div>
        ) : (
          <BuyerOrderHistorySection orders={orderList} />
        )}
      </section>
    </main>
  );
}
