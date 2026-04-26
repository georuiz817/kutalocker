"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";

export default function NavCartLink() {
  const { itemCount, hydrated } = useCart();

  return (
    <Link className="nav-cart" href="/cart" aria-label="Shopping cart">
      <span className="nav-cart-icon" aria-hidden="true">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="9" cy="20" r="1.5" fill="currentColor" />
          <circle cx="17" cy="20" r="1.5" fill="currentColor" />
        </svg>
      </span>
      {hydrated && itemCount > 0 ? (
        <span className="nav-cart-badge">{itemCount}</span>
      ) : null}
    </Link>
  );
}
