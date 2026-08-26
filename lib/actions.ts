"use server";

import { redirect } from "next/navigation";
import { createOrder } from "./orders";
import type { CartItem } from "./types";

export type CheckoutState = {
  error: string | null;
};

function isCartItem(value: unknown): value is CartItem {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.productId === "string" &&
    typeof v.slug === "string" &&
    typeof v.name === "string" &&
    typeof v.priceCents === "number" &&
    typeof v.emoji === "string" &&
    typeof v.quantity === "number" &&
    v.quantity > 0
  );
}

export async function checkoutAction(
  _prevState: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  const customerName = String(formData.get("customerName") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const notes = String(formData.get("notes") || "").trim();
  const cartRaw = String(formData.get("cartItems") || "[]");

  if (!customerName || !email || !phone || !address) {
    return { error: "Preencha nome, e-mail, telefone e endereço para finalizar o pedido." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(cartRaw);
  } catch {
    return { error: "Carrinho inválido. Volte ao carrinho e tente novamente." };
  }

  if (!Array.isArray(parsed) || parsed.length === 0 || !parsed.every(isCartItem)) {
    return { error: "Seu carrinho está vazio. Adicione produtos antes de finalizar." };
  }

  const orderId = createOrder({
    customerName,
    email,
    phone,
    address,
    notes: notes || null,
    items: parsed,
  });

  redirect(`/pedido/${orderId}`);
}
