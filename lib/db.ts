import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { CATEGORIES, SEED_PRODUCTS } from "./seed-data";

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "data", "store.db");

declare global {
  var __geekStoreDb: Database.Database | undefined;
}

function createConnection() {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      emoji TEXT NOT NULL,
      featured INTEGER NOT NULL DEFAULT 0,
      stock INTEGER NOT NULL DEFAULT 20,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      notes TEXT,
      total_cents INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendente',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL REFERENCES orders(id),
      product_id TEXT,
      name TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      quantity INTEGER NOT NULL
    );
  `);

  const { count } = db.prepare("SELECT COUNT(*) as count FROM products").get() as {
    count: number;
  };

  if (count === 0) {
    const insert = db.prepare(`
      INSERT INTO products (id, slug, name, description, category, price_cents, emoji, featured, stock)
      VALUES (@id, @slug, @name, @description, @category, @priceCents, @emoji, @featured, @stock)
    `);
    const insertAll = db.transaction((products: typeof SEED_PRODUCTS) => {
      for (const product of products) {
        insert.run({
          id: crypto.randomUUID(),
          slug: product.slug,
          name: product.name,
          description: product.description,
          category: product.category,
          priceCents: product.priceCents,
          emoji: product.emoji,
          featured: product.featured ? 1 : 0,
          stock: product.stock ?? 20,
        });
      }
    });
    insertAll(SEED_PRODUCTS);
  }

  return db;
}

export const db = globalThis.__geekStoreDb ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalThis.__geekStoreDb = db;
}

export { CATEGORIES };
