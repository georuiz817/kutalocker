"use client";

import { useEffect, useRef, useState } from "react";

const MOBILE_MQ = "(max-width: 680px)";

type Props = {
  processingOrderCount: number;
};

export default function NavSellerBell({ processingOrderCount }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const hasPending = processingOrderCount > 0;

  useEffect(() => {
    if (!mobileOpen) return;
    const close = (e: PointerEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [mobileOpen]);

  const message = hasPending
    ? processingOrderCount === 1
      ? "You have 1 order awaiting a tracking number. Add tracking to receive your payout."
      : `You have ${processingOrderCount} orders awaiting a tracking number. Add tracking to receive your payout.`
    : null;

  return (
    <div
      ref={wrapRef}
      className={`nav-bell-wrap${hasPending ? " nav-bell-wrap--pending" : ""}${
        mobileOpen ? " is-open" : ""
      }`}
    >
      <button
        type="button"
        className="nav-bell-trigger"
        aria-expanded={mobileOpen}
        aria-haspopup="true"
        aria-label="Shipment notifications"
        onClick={() => {
          if (typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches) {
            setMobileOpen((o) => !o);
          }
        }}
      >
        <span className="nav-bell-icon-wrap" aria-hidden>
          <svg
            className="nav-bell-icon"
            width="26"
            height="26"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13.73 21a2 2 0 01-3.46 0"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {hasPending ? (
            <span className="nav-bell-badge-dot" aria-hidden="true" />
          ) : null}
        </span>
      </button>
      <div
        className="nav-bell-dropdown"
        role="region"
        aria-label="Shipment notifications"
      >
        {hasPending ? (
          <p className="nav-bell-msg">{message}</p>
        ) : (
          <p className="nav-bell-msg nav-bell-msg--muted">No pending shipments.</p>
        )}
      </div>
    </div>
  );
}
