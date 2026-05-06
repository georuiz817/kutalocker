"use client";

import { useLayoutEffect, useState, type ReactNode } from "react";
import {
  LOCKER_PALETTE_HEX,
  pickRandomLockerPaletteHex,
} from "@/lib/locker-palette";

export default function CartEmptyPanel({ children }: { children: ReactNode }) {
  const [accent, setAccent] = useState<string>(LOCKER_PALETTE_HEX[0]);

  useLayoutEffect(() => {
    setAccent(pickRandomLockerPaletteHex());
  }, []);

  return (
    <div className="cart-empty-panel" style={{ backgroundColor: accent }}>
      {children}
    </div>
  );
}
