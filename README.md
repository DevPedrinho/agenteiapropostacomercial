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

## Entrada: cole a lista de peças, não preencha spec por spec

O vendedor cola a lista de peças exatamente como veio do fornecedor/nota — nome
completo, marca, modelo e código de SKU tudo misturado, uma peça por linha:

```
Ssd Kingston 480GB Sata III A400 SA400S37/480G Preto
PLACA MAE B860M EAGLE WIFI6 V2 1.0 GIGABYTE, DDR5, LGA 1851, PMI-B860MEAGLEGIGA
32gb ddr5
SSD 1TB KINGSTON SNV3S/1000G, M.2 2280, PCIE 4.0, NV-1TBKGS
FONTE C3TECH PS-G1000 1000W, 80 PLUS GOLD, FTE-1000WC3T
```

A IA identifica a categoria de cada linha, limpa o texto (remove código de SKU do
fornecedor, que não interessa ao cliente final) e separa peças duplicadas da mesma
categoria (ex: dois SSDs viram "Armazenamento (Sistema)" e "Armazenamento (Dados)").
Todo esse parsing acontece na mesma chamada que gera o conteúdo de venda — o
vendedor só cola o texto e clica em "Gerar proposta".

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
- **B2B** — ficha técnica agrupada por seção (Performance, Memória e Armazenamento, Estrutura e
  Energia), cada categoria com seus fatos como bullets `•` — o mesmo padrão das páginas de
  produto da Dell/Lenovo. Fecha com "Aplicações Recomendadas" e "Destaques da Configuração".
  Para propostas corporativas, RFP e apresentação a TI.

O painel de saída mostra um cartão visual (não texto puro) com a ficha organizada. O botão
"Copiar" copia a versão em texto do estilo selecionado — pronta para colar no Bling, WhatsApp
ou e-mail, sem precisar editar nada na tela.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha ANTHROPIC_API_KEY
npm run dev
```

Abra http://localhost:3000, preencha o nome do produto, cole a lista de peças, e
clique em "Gerar proposta".

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
