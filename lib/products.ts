import { db, CATEGORIES } from "./db";
import type { Product } from "./types";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  price_cents: number;
  emoji: string;
  featured: number;
  stock: number;
};

function mapProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    category: row.category,
    priceCents: row.price_cents,
    emoji: row.emoji,
    featured: row.featured === 1,
    stock: row.stock,
  };
}

export function getAllProducts(): Product[] {
  const rows = db
    .prepare("SELECT * FROM products ORDER BY created_at DESC")
    .all() as ProductRow[];
  return rows.map(mapProduct);
}

export function getFeaturedProducts(limit = 4): Product[] {
  const rows = db
    .prepare("SELECT * FROM products WHERE featured = 1 ORDER BY created_at DESC LIMIT ?")
    .all(limit) as ProductRow[];
  return rows.map(mapProduct);
}

export function getProductsByCategory(category: string | null): Product[] {
  if (!category) return getAllProducts();
  const rows = db
    .prepare("SELECT * FROM products WHERE category = ? ORDER BY created_at DESC")
    .all(category) as ProductRow[];
  return rows.map(mapProduct);
}

export function getProductBySlug(slug: string): Product | null {
  const row = db.prepare("SELECT * FROM products WHERE slug = ?").get(slug) as
    | ProductRow
    | undefined;
  return row ? mapProduct(row) : null;
}

export function getCategoryLabel(slug: string): string {
  return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}

export { CATEGORIES };
