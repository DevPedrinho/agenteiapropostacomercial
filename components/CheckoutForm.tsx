"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatBRL } from "@/lib/format";
import { checkoutAction, type CheckoutState } from "@/lib/actions";

const initialState: CheckoutState = { error: null };

export default function CheckoutForm() {
  const { items, totalCents } = useCart();
  const [state, formAction, pending] = useActionState(checkoutAction, initialState);

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p>Seu carrinho está vazio.</p>
        <Link href="/produtos" className="btn">
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="checkout-layout">
      <form action={formAction} className="panel checkout-form">
        <input type="hidden" name="cartItems" value={JSON.stringify(items)} />

        {state.error && <div className="error-box">{state.error}</div>}

        <div className="field">
          <label htmlFor="customerName">Nome completo</label>
          <input id="customerName" name="customerName" type="text" required />
        </div>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required />
        </div>
        <div className="field">
          <label htmlFor="phone">Telefone / WhatsApp</label>
          <input id="phone" name="phone" type="tel" required />
        </div>
        <div className="field">
          <label htmlFor="address">Endereço de entrega</label>
          <textarea id="address" name="address" rows={3} required />
        </div>
        <div className="field">
          <label htmlFor="notes">Observações (opcional)</label>
          <textarea id="notes" name="notes" rows={2} />
        </div>

        <button type="submit" className="btn btn-block" disabled={pending}>
          {pending ? "Enviando..." : "Confirmar pedido"}
        </button>
        <p className="field-hint">
          Esta é uma loja de demonstração: o pedido é registrado, mas nenhum pagamento é
          processado.
        </p>
      </form>

      <div className="panel checkout-summary">
        <h2>Resumo do pedido</h2>
        {items.map((item) => (
          <div key={item.productId} className="checkout-summary-row">
            <span>
              {item.emoji} {item.name} × {item.quantity}
            </span>
            <span>{formatBRL(item.priceCents * item.quantity)}</span>
          </div>
        ))}
        <div className="checkout-summary-row checkout-summary-total">
          <span>Total</span>
          <strong>{formatBRL(totalCents)}</strong>
        </div>
      </div>
    </div>
  );
}
