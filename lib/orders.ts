import { db } from "./db";
import type { CartItem, Order, OrderItem } from "./types";

type NewOrderInput = {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  notes: string | null;
  items: CartItem[];
};

export function createOrder(input: NewOrderInput): string {
  const orderId = crypto.randomUUID();
  const totalCents = input.items.reduce(
    (sum, item) => sum + item.priceCents * item.quantity,
    0
  );

  const insertOrder = db.prepare(`
    INSERT INTO orders (id, customer_name, email, phone, address, notes, total_cents, status)
    VALUES (@id, @customerName, @email, @phone, @address, @notes, @totalCents, 'pendente')
  `);
  const insertItem = db.prepare(`
    INSERT INTO order_items (id, order_id, product_id, name, price_cents, quantity)
    VALUES (@id, @orderId, @productId, @name, @priceCents, @quantity)
  `);

  const run = db.transaction(() => {
    insertOrder.run({
      id: orderId,
      customerName: input.customerName,
      email: input.email,
      phone: input.phone,
      address: input.address,
      notes: input.notes,
      totalCents,
    });
    for (const item of input.items) {
      insertItem.run({
        id: crypto.randomUUID(),
        orderId,
        productId: item.productId,
        name: item.name,
        priceCents: item.priceCents,
        quantity: item.quantity,
      });
    }
  });
  run();

  return orderId;
}

type OrderRow = {
  id: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  notes: string | null;
  total_cents: number;
  status: string;
  created_at: string;
};

type OrderItemRow = {
  id: string;
  product_id: string | null;
  name: string;
  price_cents: number;
  quantity: number;
};

export function getOrderById(id: string): Order | null {
  const row = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as OrderRow | undefined;
  if (!row) return null;

  const itemRows = db
    .prepare("SELECT * FROM order_items WHERE order_id = ?")
    .all(id) as OrderItemRow[];

  const items: OrderItem[] = itemRows.map((item) => ({
    id: item.id,
    productId: item.product_id,
    name: item.name,
    priceCents: item.price_cents,
    quantity: item.quantity,
  }));

  return {
    id: row.id,
    customerName: row.customer_name,
    email: row.email,
    phone: row.phone,
    address: row.address,
    notes: row.notes,
    totalCents: row.total_cents,
    status: row.status,
    createdAt: row.created_at,
    items,
  };
}
