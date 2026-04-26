import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function OrdersPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/orders");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "buyer") {
    redirect("/");
  }

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
      <h1>Order history</h1>
      <p className="muted">Past purchases from Kura.</p>

      {!orders?.length ? (
        <p className="muted">You have not placed an order yet.</p>
      ) : (
        <ul className="orders-list">
          {orders.map((order) => {
            const locker = order.lockers as
              | { number: number; nickname: string }
              | null;
            const oi = order.order_items as
              | {
                  item_id: string;
                  items: {
                    number: number;
                    name: string | null;
                    price: number;
                  } | null;
                }[]
              | null;
            const items = (oi ?? [])
              .map((x) => x.items)
              .filter(Boolean) as { number: number; name: string | null; price: number }[];
            const date = new Date(order.created_at);
            return (
              <li key={order.id} className="orders-card panel">
                <div className="orders-card-header">
                  <p className="mono">Locker #{locker?.number}</p>
                  <p className="orders-locker-nick">{locker?.nickname}</p>
                  <p className="orders-date muted">
                    {date.toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>
                <p className="orders-total">
                  Total:{" "}
                  <span className="mono">${Number(order.total).toFixed(2)}</span>
                </p>
                <ul className="orders-items">
                  {items.map((it) => (
                    <li key={it.number}>
                      <span className="mono">#{it.number}</span>{" "}
                      {it.name?.trim() ? it.name : `Item ${it.number}`} —{" "}
                      <span className="mono">
                        ${Number(it.price).toFixed(2)}
                      </span>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      )}

      <p>
        <Link className="text-link" href="/">
          Back to shop
        </Link>
      </p>
    </main>
  );
}
