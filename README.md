# Agente de Proposta Comercial

Gera fichas de produto no padrão que Dell e Lenovo usam em product sheets: frase de
posicionamento antes das specs, um bloco "Visão rápida" com os dados que mais pesam
na decisão, ficha técnica completa, e os argumentos de venda ("Por que essa
configuração") separados da aplicação prática ("Indicado para").

## Estrutura da saída

```
🖥️ UPAR ENTERPRISE
CORE I5-14400F | 16GB DDR4 | SSD NVMe 1TB | 500W

Produtividade estável para equipes que trabalham o dia inteiro.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚡ VISÃO RÁPIDA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚡ Processador — Core i5-14400F, 10 núcleos / 16 threads
🧠 Memória — 16GB DDR4 3200MHz Dual Channel
...
```

O conteúdo é gerado **uma vez** pela API da Anthropic, como um objeto estruturado
(`ProposalContent` em `lib/types.ts`): posicionamento, visão rápida, ficha completa,
argumento de venda e aplicação prática. Cada estilo de saída é uma função pura que
renderiza esse mesmo objeto (`lib/render-styles.ts`) — trocar de estilo no painel
não faz uma nova chamada de geração.

## Estilos

- **Comercial** — emoji e réguas `━`, para e-mail e propostas em geral.
- **Executivo** — mesma estrutura, zero emoji, tom sóbrio. Indicado para licitação,
  departamento de TI, e para PDFs (ex: exportação pelo Bling) cujo gerador não
  renderiza emoji e o troca por um quadradinho vazio. As réguas `━` e os
  marcadores `✔ ▪ •` são caracteres de texto comum, não emoji — passam em
  qualquer lugar.
- **Compacto** — versão curta para WhatsApp, com `*negrito*` no lugar das réguas.

O painel de saída é editável: o texto pode ser ajustado à mão antes de copiar.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY
npm run dev
```

Abra http://localhost:3000, preencha o nome do produto e os specs, e clique em
"Gerar proposta".

### Variáveis de ambiente

- `ANTHROPIC_API_KEY` (obrigatória) — chave da API da Anthropic usada para gerar
  o conteúdo estruturado da proposta.
- `ANTHROPIC_MODEL` (opcional) — sobrescreve o modelo padrão
  (`claude-sonnet-4-5-20250929`).

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm run typecheck` — checagem de tipos sem gerar build
