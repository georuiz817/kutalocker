import Link from "next/link";
import { redirect } from "next/navigation";
import AccountPasswordForm from "@/components/AccountPasswordForm";
import { DeleteLockerButton } from "@/components/DeleteLockerModal";
import SellerOrderTrackingForm from "@/components/SellerOrderTrackingForm";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

type ShippingAddressJson = {
  name?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

function formatShippingAddress(value: unknown): string | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const a = value as ShippingAddressJson;
  const line2 = a.line2?.trim();
  const cityLine = [a.city, a.state, a.postal_code].filter(Boolean).join(", ");
  const parts = [a.name, a.line1, line2 || null, cityLine, a.country].filter(
    (p) => p && String(p).trim().length
  ) as string[];
  if (!parts.length) {
    return null;
  }
  return parts.join(" · ");
}

function lockerBadgeMeta(state: string): { label: string; className: string } {
  if (state === "active") {
    return { label: "Active", className: "state-active" };
  }
  if (state === "sold_out") {
    return { label: "Sold out", className: "state-sold-out" };
  }
  return { label: "Unavailable", className: "state-unavailable" };
}

type SellerOrderRow = {
  id: string;
  total: number;
  created_at: string;
  locker_id: string;
  shipping_address: unknown;
  tracking_number: string | null;
  carrier: string | null;
  order_items: {
    item_id: string;
    items: {
      number: number;
      name: string | null;
      price: number;
    } | null;
  }[] | null;
};

type DashboardPageProps = {
  searchParams?: { connect?: string | string[] };
};

function normalizeQueryParam(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value[0];
  }
  return undefined;
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const email = user.email ?? "";

  const { data: me } = await supabase
    .from("users")
    .select("stripe_account_id, role")
    .eq("id", user.id)
    .maybeSingle();

  const isSeller = me?.role === "seller";
  const stripeAccountId = me?.stripe_account_id?.trim() ?? "";
  let chargesEnabled = false;
  if (isSeller && stripeAccountId.length > 0) {
    try {
      const stripe = getStripe();
      const account = await stripe.accounts.retrieve(stripeAccountId);
      chargesEnabled = account.charges_enabled === true;
    } catch (err) {
      console.error("[dashboard] Stripe Connect account retrieve failed:", err);
    }
  }

  const payoutsIncomplete = isSeller && !chargesEnabled;

  const connectParam = normalizeQueryParam(searchParams?.connect);
  const connectSuccessBanner = connectParam === "success";
  const connectRefreshBanner = connectParam === "refresh";

  const { data: lockers } = await supabase
    .from("lockers")
    .select("*")
    .eq("seller_id", user.id)
    .order("number", { ascending: true });

  const lockerIds = lockers?.map((l) => l.id) ?? [];
  const lockerById = new Map(lockers?.map((l) => [l.id, l]) ?? []);

  let sellerOrders: SellerOrderRow[] = [];
  const buyerEmailByOrder = new Map<string, string | null>();

  if (lockerIds.length > 0) {
    const orderSelect = `
          id,
          total,
          created_at,
          locker_id,
          shipping_address,
          tracking_number,
          carrier,
          order_items (
        item_id,
        items ( number, name, price )
      )
    `;

    const admin = createServiceRoleClient();
    const { data: oRows, error: ordersError } = await admin
      .from("orders")
      .select(orderSelect)
      .in("locker_id", lockerIds)
      .order("created_at", { ascending: false });

    if (ordersError) {
      console.error("Seller orders query failed:", ordersError.message);
    }

    sellerOrders = (oRows ?? []) as SellerOrderRow[];

    await Promise.all(
      sellerOrders.map(async (o) => {
        const { data: email } = await supabase.rpc(
          "seller_order_buyer_email",
          { p_order_id: o.id }
        );
        buyerEmailByOrder.set(o.id, email);
      })
    );
  }

  return (
    <main className="page-shell dashboard-page">
      {connectSuccessBanner ? (
        <p className="banner banner-success dashboard-connect-flash" role="status">
          Payouts set up successfully.
        </p>
      ) : null}
      {connectRefreshBanner ? (
        <p className="banner banner-readonly dashboard-connect-flash" role="status">
          Your Stripe session expired. Finish payout setup — use the button in the
          Payouts section below.
        </p>
      ) : null}
      {payoutsIncomplete ? (
        <p className="banner dashboard-connect-warning">
          Finish Stripe payout setup so you can receive seller payouts once Kura Market
          sends them manually.
        </p>
      ) : null}

      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Seller dashboard</p>
          <h1>Your lockers</h1>
          <p className="muted">
            Create a locker, add items, and remove it from the dashboard when you
            no longer need it (only if it has no orders).
          </p>
        </div>
        <Link className="button-link" href="/dashboard/lockers/new">
          Create locker
        </Link>
      </header>

      {!lockers?.length ? (
        <section className="panel empty-state">
          <p className="muted">You do not have any lockers yet.</p>
          <Link className="button-link" href="/dashboard/lockers/new">
            Create your first locker
          </Link>
        </section>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Number</th>
                <th scope="col">Nickname</th>
                <th scope="col">State</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {lockers.map((locker) => {
                const badge = lockerBadgeMeta(locker.state);
                return (
                  <tr key={locker.id}>
                    <td className="mono">{locker.number}</td>
                    <td>{locker.nickname}</td>
                    <td>
                      <span className={`state-badge ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="row-actions">
                      <Link
                        className="button-ghost"
                        href={`/dashboard/lockers/${locker.id}`}
                      >
                        Edit
                      </Link>
                      <DeleteLockerButton lockerId={locker.id} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <section className="dashboard-orders">
        <h2 className="dashboard-orders-title">Orders</h2>
        <p className="muted small dashboard-orders-lead">
          Purchases from your lockers. Shipping addresses are from Stripe checkout.
        </p>

        {!lockerIds.length || !sellerOrders.length ? (
          <div className="panel empty-state dashboard-orders-empty">
            <p className="muted">No orders yet.</p>
          </div>
        ) : (
          <ul className="seller-orders-list">
            {sellerOrders.map((order) => {
              const locker = lockerById.get(order.locker_id);
              const oi = order.order_items;
              const date = new Date(order.created_at);
              const address = formatShippingAddress(order.shipping_address);
              const buyerOrderEmail = buyerEmailByOrder.get(order.id);
              const trackingPending =
                order.tracking_number == null ||
                !String(order.tracking_number).trim();

              return (
                <li key={order.id} className="seller-order-card panel">
                  <p className="seller-order-ship-pill-wrap">
                    {trackingPending ? (
                      <span className="seller-order-tracking-pending-badge">
                        Tracking # pending
                      </span>
                    ) : (
                      <span className="seller-order-shipped-badge">Shipped</span>
                    )}
                  </p>
                  <p className="seller-order-date muted">
                    {date.toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                  <p>
                    <span className="mono">Locker #{locker?.number}</span> —{" "}
                    {locker?.nickname}
                  </p>
                  <p>
                    <span className="muted">Total:</span>{" "}
                    <span className="mono">${Number(order.total).toFixed(2)}</span>
                  </p>
                  {buyerOrderEmail ? (
                    <p>
                      <span className="muted">Buyer:</span> {buyerOrderEmail}
                    </p>
                  ) : null}
                  {address ? (
                    <p className="seller-order-ship">
                      <span className="muted">Ship to:</span> {address}
                    </p>
                  ) : (
                    <p className="muted small">No shipping address on file.</p>
                  )}
                  <ul className="seller-order-items">
                    {(oi ?? []).map((row) => {
                      const it = row.items;
                      if (!it) {
                        return null;
                      }
                      return (
                        <li key={row.item_id}>
                          <span className="mono">#{it.number}</span>{" "}
                          {it.name?.trim() ? it.name : `Item ${it.number}`} —{" "}
                          <span className="mono">
                            ${Number(it.price).toFixed(2)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <SellerOrderTrackingForm
                    orderId={order.id}
                    initialTracking={order.tracking_number}
                    initialCarrier={order.carrier}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="dashboard-orders" aria-labelledby="dashboard-profile-title">
        <h2 className="dashboard-orders-title" id="dashboard-profile-title">
          Profile
        </h2>
        <p className="muted small dashboard-orders-lead">
          Email and password for this account.
        </p>

        <div className="panel seller-order-card dashboard-profile-card">
          <p className="muted">
            Email: <span className="mono">{email}</span>
          </p>
          <AccountPasswordForm email={email} />
        </div>
      </section>

      {isSeller ? (
        <section
          className="dashboard-orders"
          aria-labelledby="dashboard-payouts-title"
        >
          <h2 className="dashboard-orders-title" id="dashboard-payouts-title">
            Payouts
          </h2>
          <p className="muted small dashboard-orders-lead">
            Connect Stripe Express to receive payouts. Buyers still pay Kura Market
            at checkout; transfers are handled manually outside of checkout.
          </p>

          <div className="panel seller-order-card dashboard-payouts-connect">
            {chargesEnabled ? (
              <>
                <p className="dashboard-payouts-active-row">
                  <span className="seller-order-shipped-badge">
                    Payouts Active
                  </span>
                </p>
                <p className="muted small">
                  Manage your seller profile and statements in Stripe. Opens in a
                  new tab.{" "}
                  <a
                    className="text-link"
                    href="/api/connect/login"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Manage payouts
                  </a>
                  .
                </p>
              </>
            ) : stripeAccountId ? (
              <>
                <p className="muted small">
                  Stripe onboarding isn&apos;t complete yet — continue where you left
                  off.
                </p>
                <a className="button-link" href="/api/connect/onboard">
                  Complete payout setup
                </a>
              </>
            ) : (
              <>
                <p className="muted small">
                  Link Stripe so you&apos;re ready to receive payouts when Kura Market
                  sends them.
                </p>
                <a className="button-link" href="/api/connect/onboard">
                  Set Up Payouts
                </a>
              </>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
