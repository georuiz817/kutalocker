"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/CartProvider";
import { getBuyerAuth } from "@/lib/buyer-auth";

export default function CartPage() {
  const { cart, removeLine, clearCart, hydrated } = useCart();
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);

  const loginHref = `/login?next=${encodeURIComponent("/cart")}`;

  const subtotal = cart.lines.reduce((sum, line) => sum + line.price, 0);
  const shipping = cart.locker ? cart.locker.shippingRate : 0;
  const total = subtotal + shipping;

  async function handleCheckout() {
    setCheckoutMessage(null);
    const auth = await getBuyerAuth();
    if (!auth.ok) {
      if (auth.reason === "not_logged_in") {
        setCheckoutMessage(
          "Log in as a buyer to check out."
        );
      } else {
        setCheckoutMessage("Only buyer accounts can check out.");
      }
      return;
    }
    setCheckoutMessage("Checkout with Stripe is coming soon.");
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
          <span>Subtotal</span>
          <span className="mono">${subtotal.toFixed(2)}</span>
        </div>
        <div className="cart-total-row">
          <span>Shipping (flat)</span>
          <span className="mono">${shipping.toFixed(2)}</span>
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

      <button type="button" className="button-link cart-checkout-btn" onClick={handleCheckout}>
        Checkout
      </button>
      <p className="muted small cart-checkout-note">
        Payment will be added in a later step (Stripe).
      </p>
    </main>
  );
}
