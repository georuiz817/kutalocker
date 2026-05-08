import {
  inferCarrierFromTracking,
  trackingUrlForCarrier,
} from "@/lib/tracking";

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
  tracking_number?: string | null;
  carrier?: string | null;
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
        const trackingDisplay = order.tracking_number?.trim() ?? "";
        const shipped = trackingDisplay.length > 0;
        const trackingNormalized = trackingDisplay.replace(/\s+/g, "");
        const inferredCarrier = shipped
          ? inferCarrierFromTracking(trackingDisplay)
          : null;
        const trackUrl =
          inferredCarrier != null
            ? trackingUrlForCarrier(
                inferredCarrier,
                trackingNormalized || trackingDisplay,
              )
            : null;

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

              <div className="receipt-status">
                {shipped ? (
                  <>
                    <p className="receipt-status-msg receipt-status-msg--shipped">
                      Status: Shipped
                    </p>
                    {trackUrl ? (
                      <p className="receipt-status-track">
                        <a
                          href={trackUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="receipt-status-track-link"
                        >
                          {trackingDisplay}
                        </a>
                      </p>
                    ) : (
                      <p className="receipt-status-track receipt-status-track--plain">
                        {trackingDisplay}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="receipt-status-msg receipt-status-msg--processing">
                    Status: Processing
                  </p>
                )}
              </div>
            </div>
            <div className="receipt-edge receipt-edge--bottom" aria-hidden="true" />
          </li>
        );
      })}
    </ul>
  );
}
