"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CartEmptyPanel from "@/components/CartEmptyPanel";
import { useCart } from "@/components/CartProvider";
import { getBuyerAuth } from "@/lib/buyer-auth";
import { lockerPaletteHexByNumber } from "@/lib/locker-palette";
import { createClient } from "@/lib/supabase";

export default function CartPage() {
  const { cart, removeLine, clearCart, hydrated } = useCart();
  const supabase = useMemo(() => createClient(), []);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const loginHref = `/login?next=${encodeURIComponent("/cart")}`;

  const subtotal = cart.lines.reduce((sum, line) => sum + line.price, 0);
  const subtotalR = Math.round(subtotal * 100) / 100;
  const platformFee = Math.round(subtotalR * 0.1 * 100) / 100;
  const shipping = cart.locker ? cart.locker.shippingRate : 0;
  const shippingR = Math.round(shipping * 100) / 100;
  const total = Math.round((subtotalR + platformFee + shippingR) * 100) / 100;

  useEffect(() => {
    if (!hydrated || !cart.locker) {
      setPhotoUrl(null);
      return;
    }
    const l = cart.locker;
    let cancelled = false;

    if (l.photoUrl) {
      setPhotoUrl(l.photoUrl);
      return;
    }

    void (async () => {
      const { data } = await supabase
        .from("lockers")
        .select("photo_url")
        .eq("id", l.id)
        .maybeSingle();
      if (!cancelled) setPhotoUrl(data?.photo_url ?? null);
    })();

    return () => {
      cancelled = true;
    };
  }, [hydrated, cart.locker?.id, cart.locker?.photoUrl, supabase]);

  async function handleCheckout() {
    if (!cart.locker) return;
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
      <main className="page-shell cart-page cart-page--empty">
        <div className="cart-empty-stage">
          <img
            className="cart-empty-deco cart-empty-deco--a"
            src="/stickers/peach/peachStar.png"
            alt=""
            width={48}
            height={48}
          />
          <img
            className="cart-empty-deco cart-empty-deco--b"
            src="/stickers/pink/blushPinkghost.png"
            alt=""
            width={48}
            height={48}
          />
          <img
            className="cart-empty-deco cart-empty-deco--c"
            src="/stickers/mint/mineGreenToast.png"
            alt=""
            width={48}
            height={48}
          />
          <img
            className="cart-empty-deco cart-empty-deco--d"
            src="/stickers/peach/peachCat.png"
            alt=""
            width={48}
            height={48}
          />
          <CartEmptyPanel>
            <img
              className="cart-empty-hero"
              src="/stickers/mint/mintGreenCat.png"
              alt=""
              width={180}
              height={120}
            />
            <h1 className="cart-empty-title">
              Your cart is empty... for now! ✦
            </h1>
            <p className="cart-empty-sub">
              Go explore the lockers and find something special ♡
            </p>
            <Link className="cart-empty-browse-btn" href="/">
              Browse lockers
            </Link>
          </CartEmptyPanel>
        </div>
      </main>
    );
  }

  const accent = lockerPaletteHexByNumber(cart.locker.number);

  return (
    <main className="page-shell cart-page cart-page--filled">
      <div className="cf-top">
        <h1 className="cf-heading">
          Cart
          {/* eslint-disable-next-line @next/next/no-img-element -- static public asset, dimensions set in CSS */}
          <img className="cf-heading-pixels" src="/cartpixels.png" alt="" />
        </h1>
        <button
          type="button"
          className="cf-clear"
          onClick={clearCart}
        >
          Clear cart
        </button>
      </div>

      <div
        className="cf-card"
        style={{ backgroundColor: accent, borderColor: accent }}
      >
        <div className="cf-locker-bar">
          <div className="cf-thumb-shell">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                className="cf-thumb-img"
              />
            ) : (
              <div className="cf-thumb-placeholder" aria-hidden />
            )}
          </div>
          <div className="cf-locker-info">
            <span className="cf-locker-num">#{cart.locker.number}</span>
            <span className="cf-locker-nick">{cart.locker.nickname}</span>
          </div>
        </div>

        <ul className="cf-items">
          {cart.lines.map((line) => (
            <li key={line.itemId} className="cf-item">
              <div className="cf-item-left">
                <span className="mono cf-item-num">#{line.number}</span>{" "}
                {line.name?.trim() ? line.name : `Item ${line.number}`}
              </div>
              <div className="cf-item-right">
                <span className="mono cf-item-price">
                  ${line.price.toFixed(2)}
                </span>
                <button
                  type="button"
                  className="cf-remove"
                  onClick={() => removeLine(line.itemId)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="cf-totals">
          <div className="cf-total-row">
            <span>Subtotal</span>
            <span className="mono">${subtotalR.toFixed(2)}</span>
          </div>
          <div className="cf-total-row">
            <span>Kura Market fee</span>
            <span className="mono">${platformFee.toFixed(2)}</span>
          </div>
          <div className="cf-total-row">
            <span>Shipping</span>
            <span className="mono">${shippingR.toFixed(2)}</span>
          </div>
          <div className="cf-total-row cf-total-grand">
            <span>Total</span>
            <span className="mono">${total.toFixed(2)}</span>
          </div>
        </div>

        {checkoutMessage ? (
          <p className="form-message cf-checkout-msg" role="status">
            {checkoutMessage}{" "}
            {/log in/i.test(checkoutMessage) ? (
              <Link href={loginHref}>Log in</Link>
            ) : null}
          </p>
        ) : null}

        <button
          type="button"
          className="cf-checkout"
          onClick={handleCheckout}
          disabled={checkoutLoading}
        >
          {checkoutLoading ? "Redirecting…" : "Checkout"}
        </button>
      </div>
    </main>
  );
}
