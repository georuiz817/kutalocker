type LockerInfo = { number: number; nickname: string };

type OrderItemRow = {
  item_id: string;
  items: {
    number: number;
    name: string | null;
    price: number;
  } | null;
};

export type BuyerOrderHistoryOrder = {
  id: string;
  total: number;
  created_at: string;
  lockers: LockerInfo | null;
  order_items: OrderItemRow[] | null;
};

type Props = {
  orders: BuyerOrderHistoryOrder[] | null;
};

export default function BuyerOrderHistorySection({ orders }: Props) {
  if (!orders?.length) {
    return null;
  }

  return (
    <ul className="seller-orders-list">
      {orders.map((order) => {
        const locker = order.lockers;
        const oi = order.order_items;
        const date = new Date(order.created_at);
        return (
          <li key={order.id} className="seller-order-card panel">
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
                    <span className="mono">${Number(it.price).toFixed(2)}</span>
                  </li>
                );
              })}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
