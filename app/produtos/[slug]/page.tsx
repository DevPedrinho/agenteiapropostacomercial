import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AddToCartButton from "@/components/AddToCartButton";
import { formatBRL } from "@/lib/format";
import { getCategoryLabel, getProductBySlug } from "@/lib/products";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProductBySlug(slug);
  return { title: product ? `${product.name} — GeekBox` : "Produto não encontrado" };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProductBySlug(slug);

  if (!product) notFound();

  return (
    <div className="product-detail">
      <div className="product-detail-media">
        <span aria-hidden="true">{product.emoji}</span>
      </div>
      <div className="product-detail-info">
        <Link href={`/produtos?categoria=${product.category}`} className="product-category">
          {getCategoryLabel(product.category)}
        </Link>
        <h1>{product.name}</h1>
        <p className="product-detail-price">{formatBRL(product.priceCents)}</p>
        <p className="product-detail-description">{product.description}</p>
        <AddToCartButton product={product} showQuantity />
        <Link href="/produtos" className="back-link">
          ← Voltar aos produtos
        </Link>
      </div>
    </div>
  );
}
