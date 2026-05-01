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
    return <p className="muted">You have not placed an order yet.</p>;
  }

  return (
    <ul className="orders-list">
      {orders.map((order) => {
        const locker = order.lockers;
        const oi = order.order_items;
        const items = (oi ?? [])
          .map((x) => x.items)
          .filter(Boolean) as {
          number: number;
          name: string | null;
          price: number;
        }[];
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
                  <span className="mono">${Number(it.price).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ul>
  );
}
