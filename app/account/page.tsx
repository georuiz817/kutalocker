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
    <main className="page-shell account-page">
      <img
        className="account-deco account-deco--a"
        src="/stickers/peach/peachStar.png"
        alt=""
        aria-hidden="true"
      />
      <img
        className="account-deco account-deco--b"
        src="/stickers/mint/mintGreenCat.png"
        alt=""
        aria-hidden="true"
      />
      <img
        className="account-deco account-deco--c"
        src="/stickers/pink/blushPinkghost.png"
        alt=""
        aria-hidden="true"
      />
      <img
        className="account-deco account-deco--d"
        src="/stickers/peach/peachCat.png"
        alt=""
        aria-hidden="true"
      />

      <header className="account-header">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="account-title">Profile & orders</h1>
        </div>
        <Link className="account-back-btn" href="/">
          Back to shop
        </Link>
      </header>

      <section className="account-section account-profile-section" aria-labelledby="account-profile-title">
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

      <section className="account-section account-orders-section" aria-labelledby="account-orders-title">
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
