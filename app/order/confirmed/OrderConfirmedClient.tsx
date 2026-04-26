"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { createClient } from "@/lib/supabase";
import { getBuyerAuth } from "@/lib/buyer-auth";

type OrderView = {
  id: string;
  total: number;
  order_items: {
    item_id: string;
    items: {
      number: number;
      name: string | null;
      price: number;
    } | null;
  }[];
};

type Props = {
  sessionId: string;
};

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export default function OrderConfirmedClient({ sessionId }: Props) {
  const { clearCart } = useCart();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [message, setMessage] = useState("Confirming your payment…");
  const clearedRef = useRef(false);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;
    const max = 20;

    async function tick() {
      const auth = await getBuyerAuth();
      if (cancelled) {
        return;
      }
      if (!auth.ok) {
        setMessage("You must be signed in as a buyer to view this page.");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select(
          `
            id,
            total,
            order_items (
              item_id,
              items ( number, name, price )
            )
          `
        )
        .eq("stripe_checkout_session_id", sessionId)
        .eq("buyer_id", auth.userId)
        .maybeSingle();

      if (cancelled) {
        return;
      }
      if (error) {
        setMessage(error.message);
        return;
      }
      if (data) {
        setOrder(data as OrderView);
        setMessage("");
        if (!clearedRef.current) {
          clearCart();
          clearedRef.current = true;
        }
        return;
      }
      attempts += 1;
      if (attempts < max) {
        timer = setTimeout(tick, 1000);
      } else {
        setMessage(
          "We are still finalizing your order. Refresh this page in a moment or check your order history."
        );
      }
    }

    void tick();
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [sessionId, clearCart]);

  if (message && !order) {
    return (
      <main className="page-shell order-confirmed">
        <p className="muted">{message}</p>
        {message.startsWith("You must be") ? (
          <p>
            <Link
              href={`/login?next=${encodeURIComponent(`/order/confirmed?session_id=${sessionId}`)}`}
            >
              Log in
            </Link>
          </p>
        ) : null}
      </main>
    );
  }

  if (!order) {
    return null;
  }

  const lineItems = order.order_items
    .map((oi) => oi.items)
    .filter(Boolean) as { number: number; name: string | null; price: number }[];

  return (
    <main className="page-shell order-confirmed">
      <h1>Order confirmed</h1>
      <p className="order-confirmed-lead">
        Thank you! Your payment was received.
      </p>

      <ul className="order-confirmed-lines">
        {lineItems.map((item) => (
          <li
            key={`${item.number}-${item.price}`}
            className="order-confirmed-line"
          >
            <span>
              <span className="mono">#{item.number}</span>{" "}
              {item.name?.trim() ? item.name : `Item ${item.number}`}
            </span>
            <span className="mono">${roundMoney(Number(item.price)).toFixed(2)}</span>
          </li>
        ))}
      </ul>

      <p className="order-confirmed-total">
        Total paid:{" "}
        <strong className="mono">${roundMoney(order.total).toFixed(2)}</strong>
      </p>

      <p>
        <Link className="text-link" href="/orders">
          View order history
        </Link>{" "}
        ·{" "}
        <Link className="text-link" href="/">
          Continue shopping
        </Link>
      </p>
    </main>
  );
}
