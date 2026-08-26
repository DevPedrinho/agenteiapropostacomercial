"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";
import { formatBRL } from "@/lib/format";

export default function CartView() {
  const { items, updateQuantity, removeItem, totalCents } = useCart();

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
    <div className="cart-layout">
      <div className="cart-items">
        {items.map((item) => (
          <div key={item.productId} className="cart-row">
            <span className="cart-row-emoji" aria-hidden="true">
              {item.emoji}
            </span>
            <div className="cart-row-info">
              <Link href={`/produtos/${item.slug}`} className="cart-row-name">
                {item.name}
              </Link>
              <span className="cart-row-price">{formatBRL(item.priceCents)} / un.</span>
            </div>
            <input
              type="number"
              min={1}
              value={item.quantity}
              onChange={(e) => updateQuantity(item.productId, Number(e.target.value) || 1)}
              className="quantity-input"
              aria-label={`Quantidade de ${item.name}`}
            />
            <span className="cart-row-subtotal">
              {formatBRL(item.priceCents * item.quantity)}
            </span>
            <button
              type="button"
              className="btn-remove"
              onClick={() => removeItem(item.productId)}
              aria-label={`Remover ${item.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="cart-summary panel">
        <div className="cart-summary-row">
          <span>Total</span>
          <strong>{formatBRL(totalCents)}</strong>
        </div>
        <Link href="/checkout" className="btn btn-block">
          Finalizar pedido
        </Link>
      </div>
    </div>
  );
}
