import Link from "next/link";
import { formatBRL } from "@/lib/format";
import { getCategoryLabel } from "@/lib/products";
import type { Product } from "@/lib/types";
import AddToCartButton from "./AddToCartButton";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <div className="product-card">
      <Link href={`/produtos/${product.slug}`} className="product-card-media">
        <span aria-hidden="true">{product.emoji}</span>
      </Link>
      <div className="product-card-body">
        <span className="product-category">{getCategoryLabel(product.category)}</span>
        <Link href={`/produtos/${product.slug}`} className="product-card-title">
          {product.name}
        </Link>
        <p className="product-card-price">{formatBRL(product.priceCents)}</p>
        <AddToCartButton product={product} />
      </div>
    </div>
  );
}
