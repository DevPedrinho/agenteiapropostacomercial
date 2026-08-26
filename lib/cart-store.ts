import type { CartItem } from "./types";

const STORAGE_KEY = "geekbox-cart";

type Listener = () => void;

const EMPTY_ITEMS: CartItem[] = [];

let items: CartItem[] = EMPTY_ITEMS;
let hydrated = false;
const listeners = new Set<Listener>();

function readFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeToStorage(next: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignora falha de escrita (ex: modo privado sem quota)
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function setItems(next: CartItem[]) {
  items = next;
  writeToStorage(items);
  emit();
}

export function subscribe(listener: Listener) {
  if (!hydrated) {
    hydrated = true;
    items = readFromStorage();
    listener();
  }
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): CartItem[] {
  return items;
}

export function getServerSnapshot(): CartItem[] {
  return EMPTY_ITEMS;
}

export function addItem(item: Omit<CartItem, "quantity">, quantity = 1) {
  const existing = items.find((i) => i.productId === item.productId);
  if (existing) {
    setItems(
      items.map((i) =>
        i.productId === item.productId ? { ...i, quantity: i.quantity + quantity } : i
      )
    );
  } else {
    setItems([...items, { ...item, quantity }]);
  }
}

export function removeItem(productId: string) {
  setItems(items.filter((i) => i.productId !== productId));
}

export function updateQuantity(productId: string, quantity: number) {
  if (quantity <= 0) {
    removeItem(productId);
    return;
  }
  setItems(items.map((i) => (i.productId === productId ? { ...i, quantity } : i)));
}

export function clearCart() {
  setItems([]);
}
