/** Tipos compartilhados entre as rotas /api/bling/* e a interface. */
export type BlingProduct = {
  id: number;
  name: string;
  code: string;
  price: number | null;
  cost: number | null;
  stock: number | null;
  stockPhysical: number | null;
  active: boolean;
  imageUrl: string | null;
  shortDescription: string | null;
};

export type BlingStatus = {
  configured: boolean;
  connected: boolean;
  expiresAt?: string | null;
};
