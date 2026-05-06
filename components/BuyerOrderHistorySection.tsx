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
    <ul className="account-orders-list">
      {orders.map((order) => {
        const locker = order.lockers;
        const oi = order.order_items;
        const date = new Date(order.created_at);
        return (
          <li key={order.id} className="receipt">
            <div className="receipt-edge receipt-edge--top" aria-hidden="true" />
            <div className="receipt-body">
              <div className="receipt-header">
                <span className="receipt-store">KURA MARKET</span>
                <div className="receipt-header-line" aria-hidden="true" />
              </div>
              <p className="receipt-meta">
                {date.toLocaleString(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <p className="receipt-meta">
                Locker #{locker?.number} — {locker?.nickname}
              </p>
              <ul className="receipt-items">
                {(oi ?? []).map((row) => {
                  const it = row.items;
                  if (!it) {
                    return null;
                  }
                  return (
                    <li key={row.item_id} className="receipt-item">
                      <span className="receipt-item-name">
                        #{it.number} {it.name?.trim() ? it.name : `Item ${it.number}`}
                      </span>
                      <span className="receipt-item-dots" aria-hidden="true" />
                      <span className="receipt-item-price">
                        ${Number(it.price).toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="receipt-total">
                <span className="receipt-total-label">TOTAL</span>
                <span className="receipt-total-amount">
                  ${Number(order.total).toFixed(2)}
                </span>
              </p>
            </div>
            <div className="receipt-edge receipt-edge--bottom" aria-hidden="true" />
          </li>
        );
      })}
    </ul>
  );
}
