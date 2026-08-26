"use client";

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import * as cartStore from "./cart-store";
import type { CartItem } from "./types";

type CartContextValue = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalCents: number;
  totalItems: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const items = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot
  );

  const totalCents = useMemo(
    () => items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
    [items]
  );
  const totalItems = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem: cartStore.addItem,
      removeItem: cartStore.removeItem,
      updateQuantity: cartStore.updateQuantity,
      clearCart: cartStore.clearCart,
      totalCents,
      totalItems,
    }),
    [items, totalCents, totalItems]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart precisa ser usado dentro de um CartProvider");
  return ctx;
}
