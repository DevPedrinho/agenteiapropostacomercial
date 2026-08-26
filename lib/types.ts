export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  emoji: string;
  featured: boolean;
  stock: number;
};

export type Category = {
  slug: string;
  label: string;
  emoji: string;
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  emoji: string;
  quantity: number;
};

export type OrderItem = {
  id: string;
  productId: string | null;
  name: string;
  priceCents: number;
  quantity: number;
};

export type Order = {
  id: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  notes: string | null;
  totalCents: number;
  status: string;
  createdAt: string;
  items: OrderItem[];
};
