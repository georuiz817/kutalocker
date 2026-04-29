import { Resend } from "resend";

const DEFAULT_FROM = "onboarding@resend.dev";

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type OrderEmailLineItem = {
  number: number;
  name: string | null;
  price: number;
};

function lineItemsTableRows(items: OrderEmailLineItem[]): string {
  const sorted = [...items].sort((a, b) => a.number - b.number);
  return sorted
    .map(
      (it) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">#${it.number}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;">${escapeHtml(
        it.name?.trim() || "Item"
      )}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;">${fmtMoney(
        it.price
      )}</td>
    </tr>`
    )
    .join("");
}

function shippingAddressHtml(
  shippingAddress: Record<string, unknown> | null
): string {
  if (!shippingAddress) {
    return '<p style="margin:0;color:#666;">No shipping address on file.</p>';
  }
  const str = (k: string) =>
    typeof shippingAddress[k] === "string"
      ? (shippingAddress[k] as string).trim()
      : "";
  const name = str("name");
  const line1 = str("line1");
  const line2 = str("line2");
  const city = str("city");
  const state = str("state");
  const postal = str("postal_code");
  const country = str("country");
  const cityLine = [city, state, postal].filter(Boolean).join(", ");
  const parts = [name, line1, line2, cityLine, country].filter(Boolean);
  if (!parts.length) {
    return '<p style="margin:0;color:#666;">No shipping address on file.</p>';
  }
  return parts
    .map((p) => `<p style="margin:0 0 4px;">${escapeHtml(p)}</p>`)
    .join("");
}

export async function sendBuyerOrderConfirmationEmail(params: {
  to: string;
  lockerNickname: string;
  lockerNumber: number;
  items: OrderEmailLineItem[];
  shippingTotal: number;
  orderTotal: number;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY missing; skipping buyer confirmation email");
    return;
  }
  const from = process.env.RESEND_FROM?.trim() || DEFAULT_FROM;
  const {
    to,
    lockerNickname,
    lockerNumber,
    items,
    shippingTotal,
    orderTotal,
  } = params;

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:system-ui,-apple-system,sans-serif;font-size:15px;color:#1a1a1a;background:#f6f6f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <tr><td style="padding:24px 28px;">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;">Your order is confirmed</h1>
      <p style="margin:0 0 20px;color:#555;line-height:1.5;">Thank you for shopping on Kura Mart. Here is a summary of your purchase.</p>
      <p style="margin:0 0 16px;"><strong>Locker:</strong> ${escapeHtml(
        lockerNickname
      )} (Locker #${lockerNumber})</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:8px;">
        <thead>
          <tr style="background:#f9f9f9;">
            <th align="left" style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#666;">#</th>
            <th align="left" style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#666;">Item</th>
            <th align="right" style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#666;">Price</th>
          </tr>
        </thead>
        <tbody>${lineItemsTableRows(items)}</tbody>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
        <tr><td style="padding:8px 0;color:#555;">Shipping</td><td align="right" style="padding:8px 0;font-weight:500;">${fmtMoney(shippingTotal)}</td></tr>
        <tr><td style="padding:8px 0;font-size:16px;font-weight:600;">Order total</td><td align="right" style="padding:8px 0;font-size:16px;font-weight:600;">${fmtMoney(orderTotal)}</td></tr>
      </table>
      <p style="margin:24px 0 0;font-size:13px;color:#888;line-height:1.5;">This is an automated message from Kura Mart.</p>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "Your Kura Mart order is confirmed",
      html,
    });
    if (error) {
      console.error("Buyer confirmation email Resend error:", error);
    }
  } catch (err) {
    console.error("Buyer confirmation email failed:", err);
  }
}

export async function sendSellerNewOrderEmail(params: {
  to: string;
  items: OrderEmailLineItem[];
  shippingAddress: Record<string, unknown> | null;
  orderTotal: number;
}): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("RESEND_API_KEY missing; skipping seller order email");
    return;
  }
  const from = process.env.RESEND_FROM?.trim() || DEFAULT_FROM;
  const { to, items, shippingAddress, orderTotal } = params;

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;font-family:system-ui,-apple-system,sans-serif;font-size:15px;color:#1a1a1a;background:#f6f6f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
    <tr><td style="padding:24px 28px;">
      <h1 style="margin:0 0 8px;font-size:20px;font-weight:600;">New order</h1>
      <p style="margin:0 0 20px;color:#555;line-height:1.5;">You have a new Kura Mart order. Ship to the address below.</p>
      <h2 style="margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#666;">Items sold</h2>
      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f9f9f9;">
            <th align="left" style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#666;">#</th>
            <th align="left" style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#666;">Item</th>
            <th align="right" style="padding:10px 12px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#666;">Price</th>
          </tr>
        </thead>
        <tbody>${lineItemsTableRows(items)}</tbody>
      </table>
      <h2 style="margin:0 0 10px;font-size:14px;text-transform:uppercase;letter-spacing:.04em;color:#666;">Ship to</h2>
      <div style="margin-bottom:24px;padding:14px;background:#fafafa;border-radius:6px;border:1px solid #eee;">${shippingAddressHtml(
        shippingAddress
      )}</div>
      <p style="margin:0 0 8px;font-size:16px;font-weight:600;">Order total: ${fmtMoney(
        orderTotal
      )}</p>
      <p style="margin:16px 0 0;color:#555;line-height:1.6;font-size:14px;">Please check your <strong>seller dashboard</strong> for full order details.</p>
      <p style="margin:12px 0 0;color:#555;line-height:1.6;font-size:14px;">For customer service questions, email <a href="mailto:KuraLocker@gmail.com" style="color:#2563eb;">KuraLocker@gmail.com</a>.</p>
      <p style="margin:24px 0 0;font-size:13px;color:#888;line-height:1.5;">This is an automated message from Kura Mart.</p>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const resend = new Resend(key);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "You have a new Kura Mart order",
      html,
    });
    if (error) {
      console.error("Seller notification email Resend error:", error);
    }
  } catch (err) {
    console.error("Seller notification email failed:", err);
  }
}
