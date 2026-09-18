# Agente de Proposta Comercial

Duas ferramentas para o time de vendas da Upar, no mesmo app:

| Rota | O que faz |
|---|---|
| `/` | **Ficha de produto** — gera a ficha no padrão Dell/Lenovo a partir da lista de peças (IA) |
| `/orcamento` | **Montador de orçamento** — substitui a planilha: item a item com custo, imposto de entrada, markup, CET e imposto de saída, com estoque puxado do Bling |

## Montador de orçamento (`/orcamento`)

O vendedor monta a máquina peça por peça. Cada linha tem categoria, nome, link do
produto no fornecedor, quantidade, custo e quatro percentuais — os mesmos da planilha:

| Percentual | Incide sobre | Exemplo |
|---|---|---|
| Imposto de entrada | o custo de compra | DIFAL/ICMS na entrada |
| Markup | o custo com imposto de entrada | margem desejada |
| CET | o preço de venda | taxa do cartão, parcelamento, antecipação |
| Imposto de saída | o preço de venda | Simples Nacional / ICMS na venda |

O preço de venda é calculado com *gross-up* — saída e CET entram como divisor, porque
incidem sobre o preço final e não sobre o custo:

```
custo com entrada = custo × (1 + entrada%)
base              = custo com entrada × (1 + markup%)
preço de venda    = base ÷ (1 − saída% − CET%)
lucro líquido     = preço − imposto de saída − CET − custo com entrada  (= markup sobre o custo com entrada)
```

Os quatro percentuais têm um **padrão por orçamento** e cada item pode sobrescrever
qualquer um deles (campo em branco = padrão). O motor está em `lib/pricing.ts`, com
testes em `tests/pricing.test.ts` (`npm test`).

**Meta do cliente.** Informe quanto o cliente quer gastar (ex: R$ 10.000). O resumo
mostra folga ou estouro e calcula o markup padrão que fecha exatamente na meta — com
um clique ele é aplicado. Itens com markup próprio ficam fixos nessa conta.

**Saídas.** "Copiar p/ cliente" gera o texto só com itens e preço de venda (sem custo
nem margem); "Copiar resumo interno" traz custo, lucro e impostos; "Baixar CSV" exporta
todas as colunas (abre direto no Excel em pt-BR); "Gerar ficha de produto" leva a lista
de peças para a página inicial já preenchida.

**Persistência.** Os orçamentos ficam no `localStorage` do navegador de cada vendedor
(seletor no topo da página: novo, duplicar, apagar). Não há banco de dados; o CSV
serve de backup e para compartilhar.

### Estoque direto do Bling

Com `BLING_CLIENT_ID` e `BLING_CLIENT_SECRET` configurados, aparece o painel **Bling**:

1. **Conectar ao Bling** — OAuth 2.0 (authorization code). Cada vendedor autoriza uma
   vez no próprio navegador; o token fica num cookie `httpOnly` criptografado
   (AES-256-GCM) e é renovado sozinho pelo refresh token (30 dias, renovado a cada uso).
   Não há tabela de tokens no servidor.
2. **Buscar no Bling** — pesquisa por nome nos produtos ativos (`GET /produtos`) e mostra
   código, saldo virtual em estoque e preço de venda cadastrado. "Adicionar" busca o
   detalhe do produto (`GET /produtos/{id}`) para trazer o **preço de custo** já
   preenchido na linha; se o Bling não tiver custo cadastrado, avisa para preencher.
3. **Atualizar estoque** — reconsulta o saldo (`GET /estoques/saldos`) de todos os itens
   que vieram do Bling e atualiza o selo verde/amarelo/vermelho de cada linha
   (verde: tem para a quantidade; amarelo: tem menos que a quantidade; vermelho: zerado).

Para configurar, crie um aplicativo em <https://developer.bling.com.br> com escopo de
leitura de **Produtos** e **Estoques** e a URL de redirecionamento
`https://SEU-DOMINIO/api/bling/callback` (em desenvolvimento,
`http://localhost:3000/api/bling/callback`). O cliente da API está em `lib/bling.ts`;
as rotas em `app/api/bling/*`. Limite do Bling: 3 requisições/segundo — a busca faz
no máximo duas (listagem + saldos) e "Adicionar" mais uma.

---

## Ficha de produto (`/`)

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
"Copiar" manda dois formatos pra área de transferência ao mesmo tempo — texto puro e HTML
(`lib/render-html.ts`) — então o Ctrl+V se adapta a onde você colar: num campo de texto rico
(ex: "Outros itens" do Bling) sai com negrito e listas de verdade; num campo simples
(WhatsApp, e-mail) sai o texto puro de sempre.

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
- `BLING_CLIENT_ID` / `BLING_CLIENT_SECRET` — credenciais do aplicativo no Bling.
  Sem elas o montador de orçamento funciona, mas sem o painel do Bling.
- `BLING_TOKEN_SECRET` (opcional) — chave para criptografar o token do Bling no cookie.
  Sem ela, deriva do client secret. Trocar invalida todas as sessões conectadas.
- `BLING_API_BASE_URL` (opcional) — URL base da API, padrão `https://www.bling.com.br/Api/v3`.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm run typecheck` — checagem de tipos sem gerar build
- `npm test` — testes do motor de precificação (Node test runner, sem dependências)
- `npm run verify` — typecheck + lint + testes + build, tudo de uma vez
