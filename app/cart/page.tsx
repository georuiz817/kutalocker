"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { getBuyerAuth } from "@/lib/buyer-auth";

export default function CartPage() {
  const { cart, removeLine, clearCart, hydrated } = useCart();
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const loginHref = `/login?next=${encodeURIComponent("/cart")}`;

  const subtotal = cart.lines.reduce((sum, line) => sum + line.price, 0);
  const subtotalR = Math.round(subtotal * 100) / 100;
  const platformFee = Math.round(subtotalR * 0.1 * 100) / 100;
  const shipping = cart.locker ? cart.locker.shippingRate : 0;
  const shippingR = Math.round(shipping * 100) / 100;
  const total = Math.round((subtotalR + platformFee + shippingR) * 100) / 100;

  async function handleCheckout() {
    if (!cart.locker) {
      return;
    }
    setCheckoutMessage(null);
    setCheckoutLoading(true);
    const auth = await getBuyerAuth();
    if (!auth.ok) {
      setCheckoutLoading(false);
      if (auth.reason === "not_logged_in") {
        setCheckoutMessage("Log in as a buyer to check out.");
      } else {
        setCheckoutMessage("Only buyer accounts can check out.");
      }
      return;
    }
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: cart.lines.map((l) => l.itemId),
          lockerId: cart.locker.id,
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        setCheckoutMessage(data.error ?? "Could not start checkout.");
        return;
      }
      if (data.url) {
        window.location.assign(data.url);
        return;
      }
      setCheckoutMessage("Could not start checkout.");
    } catch {
      setCheckoutMessage("Network error. Try again.");
    } finally {
      setCheckoutLoading(false);
    }
  }

  if (!hydrated) {
    return (
      <main className="page-shell cart-page">
        <p className="muted">Loading cart…</p>
      </main>
    );
  }

  if (!cart.lines.length || !cart.locker) {
    return (
      <main className="page-shell cart-page">
        <h1>Your cart</h1>
        <p className="muted">Your cart is empty.</p>
        <Link className="button-link" href="/">
          Browse lockers
        </Link>
      </main>
    );
  }

  return (
    <main className="page-shell cart-page">
      <div className="cart-page-header">
        <h1>Your cart</h1>
        <p className="muted">
          Locker #{cart.locker.number} — {cart.locker.nickname}
        </p>
        <button type="button" className="button-ghost" onClick={clearCart}>
          Clear cart
        </button>
      </div>

      <ul className="cart-lines">
        {cart.lines.map((line) => (
          <li key={line.itemId} className="cart-line">
            <div>
              <span className="mono">#{line.number}</span>{" "}
              {line.name?.trim() ? line.name : `Item ${line.number}`}
            </div>
            <div className="cart-line-right">
              <span className="mono">${line.price.toFixed(2)}</span>
              <button
                type="button"
                className="link-button cart-remove"
                onClick={() => removeLine(line.itemId)}
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="cart-totals">
        <div className="cart-total-row">
          <span>Subtotal (items)</span>
          <span className="mono">${subtotalR.toFixed(2)}</span>
        </div>
        <div className="cart-total-row">
          <span>Platform fee (10%)</span>
          <span className="mono">${platformFee.toFixed(2)}</span>
        </div>
        <div className="cart-total-row">
          <span>Shipping (flat)</span>
          <span className="mono">${shippingR.toFixed(2)}</span>
        </div>
        <div className="cart-total-row cart-total-strong">
          <span>Total</span>
          <span className="mono">${total.toFixed(2)}</span>
        </div>
      </div>

      {checkoutMessage ? (
        <p className="form-message cart-checkout-msg" role="status">
          {checkoutMessage}{" "}
          {/log in/i.test(checkoutMessage) ? (
            <Link href={loginHref}>Log in</Link>
          ) : null}
        </p>
      ) : null}

      <button
        type="button"
        className="button-link cart-checkout-btn"
        onClick={handleCheckout}
        disabled={checkoutLoading}
      >
        {checkoutLoading ? "Redirecting…" : "Checkout with Stripe"}
      </button>
      <p className="muted small cart-checkout-note">
        Secure payment via Stripe. You will be asked for a shipping address at checkout.
      </p>
    </main>
  );
}
