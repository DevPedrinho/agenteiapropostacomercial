"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart-context";
import type { Product } from "@/lib/types";

export default function AddToCartButton({
  product,
  showQuantity = false,
}: {
  product: Product;
  showQuantity?: boolean;
}) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  function handleAdd() {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        name: product.name,
        priceCents: product.priceCents,
        emoji: product.emoji,
      },
      showQuantity ? quantity : 1
    );
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="add-to-cart">
      {showQuantity && (
        <input
          type="number"
          min={1}
          max={product.stock}
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
          className="quantity-input"
          aria-label="Quantidade"
        />
      )}
      <button type="button" className="btn" onClick={handleAdd}>
        {added ? "Adicionado ✓" : "Adicionar ao carrinho"}
      </button>
    </div>
  );
}
