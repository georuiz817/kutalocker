"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useCart, type CartLockerMeta } from "@/components/CartProvider";
import { getBuyerAuth } from "@/lib/buyer-auth";
import type { Tables } from "@/lib/database.types";

type ItemRow = Tables<"items">;

type Props = {
  locker: CartLockerMeta;
  item: ItemRow;
};

export default function AddToCartButton({ locker, item }: Props) {
  const pathname = usePathname();
  const { addLine } = useCart();
  const [lockerWarning, setLockerWarning] = useState(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const [added, setAdded] = useState(false);

  const loginHref = `/login?next=${encodeURIComponent(pathname || "/")}`;

  async function handleClick() {
    setLockerWarning(false);
    setAuthMessage(null);
    setAdded(false);

    const auth = await getBuyerAuth();
    if (!auth.ok) {
      if (auth.reason === "not_logged_in") {
        setAuthMessage("Log in to add items to your cart.");
      } else {
        setAuthMessage("Only buyer accounts can add items to the cart.");
      }
      return;
    }

    const result = addLine(locker, {
      itemId: item.id,
      number: item.number,
      name: item.name,
      price: item.price,
    });

    if (!result.ok && result.reason === "different-locker") {
      setLockerWarning(true);
      return;
    }

    setAdded(true);
    window.setTimeout(() => setAdded(false), 2000);
  }

  return (
    <div className="add-to-cart-wrap">
      <button type="button" className="button-link add-to-cart-btn" onClick={handleClick}>
        {added ? "Added" : "Add to cart"}
      </button>
      {lockerWarning ? (
        <p className="cart-warning" role="alert">
          Only items from the same locker can be added to your cart at once. Please complete or clear your current cart first.
        </p>
      ) : null}
      {authMessage ? (
        <p className="cart-warning" role="alert">
          {authMessage}{" "}
          {authMessage.startsWith("Log in") ? (
            <Link href={loginHref}>Log in</Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
