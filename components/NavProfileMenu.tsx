"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Database } from "@/lib/database.types";

type UserRole = Database["public"]["Enums"]["user_role"];

type Props = {
  email: string;
  role: UserRole | null | undefined;
  signOutAction: () => Promise<void>;
};

const MOBILE_MQ = "(max-width: 680px)";

export default function NavProfileMenu({
  email,
  role,
  signOutAction,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const closeMobile = () => setMobileOpen(false);

  return (
    <div
      ref={wrapRef}
      className={`nav-profile-wrap${mobileOpen ? " is-open" : ""}`}
    >
      <button
        type="button"
        className="nav-profile-trigger"
        aria-expanded={mobileOpen}
        aria-haspopup="true"
        aria-label="Account menu"
        onClick={() => {
          if (typeof window !== "undefined" && window.matchMedia(MOBILE_MQ).matches) {
            setMobileOpen((o) => !o);
          }
        }}
      >
        <svg
          className="nav-profile-icon"
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle
            cx="12"
            cy="8.5"
            r="3.5"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M5 19c0-3.5 3.5-6 7-6s7 2.5 7 6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
      <div className="nav-profile-dropdown" role="menu">
        <p className="nav-profile-email">{email}</p>
        {role === "buyer" ? (
          <Link
            href="/account"
            className="nav-profile-link"
            role="menuitem"
            onClick={closeMobile}
          >
            Account
          </Link>
        ) : null}
        {role === "seller" ? (
          <Link
            href="/dashboard"
            className="nav-profile-link"
            role="menuitem"
            onClick={closeMobile}
          >
            Dashboard
          </Link>
        ) : null}
        <form action={signOutAction} className="nav-profile-signout-form">
          <button type="submit" className="nav-profile-logout" role="menuitem">
            Log out
          </button>
        </form>
      </div>
    </div>
  );
}
