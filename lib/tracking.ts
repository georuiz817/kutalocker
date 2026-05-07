/** Carrier values stored on `orders.carrier`; must match DB check constraint. */
export const ORDER_CARRIER_OPTIONS = ["USPS", "UPS", "FedEx", "Other"] as const;
export type OrderCarrier = (typeof ORDER_CARRIER_OPTIONS)[number];

export function isOrderCarrier(value: string): value is OrderCarrier {
  return (ORDER_CARRIER_OPTIONS as readonly string[]).includes(value);
}

/**
 * Carrier tracking URL for buyers; Other returns null (show plain tracking text only).
 * Tracking value is interpolated into query strings (encodeURIComponent recommended by callers).
 */
export function trackingUrlForCarrier(
  carrier: OrderCarrier | string | null,
  trackingNumber: string
): string | null {
  const t = trackingNumber.trim();
  if (!t || !carrier) return null;

  switch (carrier) {
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(t)}`;
    case "UPS":
      return `https://www.ups.com/track?tracknum=${encodeURIComponent(t)}`;
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(t)}`;
    default:
      return null;
  }
}
