# GeekBox

Loja virtual para venda de produtos geek: colecionáveis, camisetas, jogos de tabuleiro,
acessórios gamer, canecas, papelaria e quadrinhos/mangás.

## Funcionalidades

- **Vitrine de produtos** com filtro por categoria (`/produtos`) e página de detalhe
  de cada item (`/produtos/[slug]`).
- **Carrinho de compras** persistido no navegador (`localStorage`), com ajuste de
  quantidade e remoção de itens.
- **Checkout** que registra o pedido (dados do cliente + itens) no banco de dados e
  gera uma página de confirmação (`/pedido/[id]`).
- Não há integração de pagamento real: o pedido fica com status `pendente` para
  contato manual com o cliente.

## Stack

- **Next.js (App Router)** + React + TypeScript.
- **better-sqlite3** como banco de dados local (arquivo `data/store.db`, criado e
  populado automaticamente na primeira execução — sem passo manual de migração).
- Carrinho gerenciado por Context API do React no cliente; checkout via
  **Server Action** (`lib/actions.ts`).

## Estrutura de dados

- `products` — catálogo (seed inicial em `lib/seed-data.ts`, ~18 produtos em 7
  categorias).
- `orders` / `order_items` — pedidos registrados no checkout.

Esquema e seed ficam em `lib/db.ts`, que roda `CREATE TABLE IF NOT EXISTS` e popula
os produtos apenas se a tabela estiver vazia — não precisa de CLI de migração
separada.

## Rodando localmente

```bash
npm install
npm run dev
```

Abra http://localhost:3000. O banco de dados SQLite é criado automaticamente em
`data/store.db` (pasta ignorada pelo git) na primeira requisição.

### Variáveis de ambiente

- `DATABASE_PATH` (opcional) — caminho do arquivo SQLite. Padrão:
  `./data/store.db`.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run start` — servidor de produção
- `npm run lint` — ESLint
- `npm run typecheck` — checagem de tipos sem gerar build
