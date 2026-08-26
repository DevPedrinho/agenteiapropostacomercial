"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

export default function Header() {
  const { totalItems } = useCart();

  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href="/" className="brand">
          <span className="brand-mark">👾</span>
          <span>GeekBox</span>
        </Link>
        <nav className="main-nav">
          <Link href="/">Início</Link>
          <Link href="/produtos">Produtos</Link>
        </nav>
        <Link href="/carrinho" className="cart-link">
          🛒 Carrinho
          {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
        </Link>
      </div>
    </header>
  );
}
