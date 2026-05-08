/** Carrier values stored on `orders.carrier`; must match DB check constraint. */
export const ORDER_CARRIER_OPTIONS = ["USPS", "UPS", "FedEx", "Other"] as const;
export type OrderCarrier = (typeof ORDER_CARRIER_OPTIONS)[number];

export function isOrderCarrier(value: string): value is OrderCarrier {
  return (ORDER_CARRIER_OPTIONS as readonly string[]).includes(value);
}

/**
 * Infer USPS | UPS | FedEx from common tracking number shapes (buyer-facing URLs).
 * Order: UPS (1Z) → USPS (22 digits, then 94/92/93/70/14/23 prefixes) → FedEx (12 or
 * 15 digits numeric). Prefix rules are checked before FedEx lengths so 12-digit USPS
 * patterns are not misclassified.
 */
export function inferCarrierFromTracking(
  trackingNumber: string,
): OrderCarrier | null {
  const t = trackingNumber.trim().replace(/\s+/g, "");
  if (!t) {
    return null;
  }

  if (t.toUpperCase().startsWith("1Z")) {
    return "UPS";
  }

  if (/^\d{22}$/.test(t)) {
    return "USPS";
  }

  const uspsTwo = ["94", "92", "93", "70", "14", "23"];
  if (t.length >= 2 && uspsTwo.some((p) => t.startsWith(p))) {
    return "USPS";
  }

  if (/^\d{12}$/.test(t) || /^\d{15}$/.test(t)) {
    return "FedEx";
  }

  return null;
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
