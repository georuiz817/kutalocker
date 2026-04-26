"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

const STORAGE_KEY = "kuramart-cart-v1";

export type CartLine = {
  itemId: string;
  number: number;
  name: string | null;
  price: number;
};

export type CartLockerMeta = {
  id: string;
  number: number;
  nickname: string;
  shippingRate: number;
};

export type CartState = {
  locker: CartLockerMeta | null;
  lines: CartLine[];
};

type CartContextValue = {
  cart: CartState;
  hydrated: boolean;
  itemCount: number;
  addLine: (
    locker: CartLockerMeta,
    line: CartLine
  ) => { ok: true } | { ok: false; reason: "different-locker" };
  removeLine: (itemId: string) => void;
  clearCart: () => void;
};

const defaultCart: CartState = { locker: null, lines: [] };

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartState>(defaultCart);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CartState;
        if (parsed && Array.isArray(parsed.lines)) {
          setCart({
            locker: parsed.locker ?? null,
            lines: parsed.lines,
          });
        }
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart, hydrated]);

  const addLine = useCallback(
    (locker: CartLockerMeta, line: CartLine) => {
      let result: { ok: true } | { ok: false; reason: "different-locker" } = {
        ok: true,
      };
      setCart((prev) => {
        if (
          prev.locker &&
          prev.locker.id !== locker.id &&
          prev.lines.length > 0
        ) {
          result = { ok: false, reason: "different-locker" };
          return prev;
        }
        const nextLocker = prev.locker?.id === locker.id ? prev.locker : locker;
        const without = prev.lines.filter((l) => l.itemId !== line.itemId);
        return {
          locker: nextLocker,
          lines: [...without, line],
        };
      });
      return result;
    },
    []
  );

  const removeLine = useCallback((itemId: string) => {
    setCart((prev) => {
      const lines = prev.lines.filter((l) => l.itemId !== itemId);
      return {
        locker: lines.length ? prev.locker : null,
        lines,
      };
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart(defaultCart);
  }, []);

  const itemCount = cart.lines.length;

  const value = useMemo(
    () => ({
      cart,
      hydrated,
      itemCount,
      addLine,
      removeLine,
      clearCart,
    }),
    [cart, hydrated, itemCount, addLine, removeLine, clearCart]
  );

  return (
    <CartContext.Provider value={value}>{children}</CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within CartProvider");
  }
  return ctx;
}
