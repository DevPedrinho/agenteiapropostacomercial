# Agente de Proposta Comercial

Duas ferramentas para o time de vendas da Upar, no mesmo app:

| Rota | O que faz |
|---|---|
| `/` | **Ficha de produto** — gera a ficha no padrão Dell/Lenovo a partir da lista de peças (IA) |
| `/orcamento` | **Montador de setup** — substitui a planilha: o vendedor monta a máquina slot por slot (processador, placa-mãe, memória…) escolhendo do estoque do Bling, e o orçamento sai com custo, imposto de entrada, markup, CET e imposto de saída |

## Montador de setup (`/orcamento`)

Substitui a planilha `MAQUINAS_IND_UPAR` (uma aba por cliente, 110 abas, várias cópias). A
tela tem três colunas:

| Coluna | O que é |
|---|---|
| **Estoque Bling** (esquerda) | Catálogo de produtos ativos com saldo, classificado por peça. Clique num produto e ele entra no slot ativo, já com o preço de custo do Bling. Busca por palavras no catálogo inteiro; "buscar direto no Bling" quando não está no cache. |
| **Montagem** (centro) | A máquina slot por slot (processador, placa-mãe, memória, armazenamento, placa de vídeo, fonte, gabinete, refrigeração, extras), com as **mesmas colunas da planilha**: fornecedor, custo, imposto de entrada, **CET**, markup (×) e venda. Peça sem estoque no Bling entra com "+ manual". |
| **Resumo** (direita) | Venda total, custo, CET, lucro e margem; barra da meta do cliente com o markup que fecha nela; comparativo das opções; texto para o cliente, resumo interno, CSV e ficha de produto. |

**Opções por cliente.** Um orçamento tem quantas opções de máquina forem necessárias (na
planilha eram blocos empilhados na mesma aba). "+ Copiar esta" duplica a opção atual para
trocar uma ou duas peças; o comparativo mostra venda, lucro e distância da meta de cada uma.

### Fase 2 (planejada): agente de IA

O vendedor descreve a configuração desejada ("i5 de 14ª geração, 32 GB DDR5, RTX 4060,
SSD 1 TB, até R$ 8.000") e um agente pesquisa o catálogo do Bling, verifica estoque e
compatibilidade (soquete, DDR, potência da fonte) e propõe a opção pronta, que o vendedor
revisa nesta mesma tela. A base para isso já existe: o catálogo classificado, o motor de
preço e a ponte para a ficha de produto.

### Precificação (a conta da planilha)

Cada linha tem fornecedor, produto, link, quantidade, custo e três percentuais, com um
padrão por orçamento e sobrescrita por peça (campo em branco = padrão):

| Coluna | Na planilha | Aqui |
|---|---|---|
| Imposto de entrada | `Imposto` ×1,10 / ×1,0697 | 10 % / 6,97 % |
| CET (custo efetivo total) | `UPAR CET` = custo × imposto | calculado: custo × (1 + imposto de entrada) |
| Markup | `Markup` ×1,35 / ×1,5 | digite `1,35` ou `35`, aparece como ×1,35 |
| Imposto de saída | não existia | sobre o preço de venda; a coluna só aparece quando é maior que zero |

```
CET             = custo × (1 + imposto de entrada%)
base            = CET × markup                       ← "MARKUP" da planilha
preço de venda  = base ÷ (1 − imposto de saída%)     ← igual à base quando saída = 0
lucro líquido   = preço − imposto de saída − CET
```

O motor está em `lib/pricing.ts`, com testes em `tests/pricing.test.ts` que reproduzem
linhas reais da planilha (`npm test`).

**Meta do cliente.** Informe quanto o cliente quer gastar. O resumo mostra folga ou estouro
e calcula o markup que fecha exatamente na meta — um clique aplica. Peças com markup próprio
ficam fixas nessa conta.

**Persistência.** Os orçamentos ficam no `localStorage` do navegador de cada vendedor
(seletor no topo: novo, duplicar, apagar). Não há banco de dados; o CSV (todas as opções,
com custo, CET e margem) serve de backup e para compartilhar.

### Integração com o Bling

Com `BLING_CLIENT_ID` e `BLING_CLIENT_SECRET` configurados, aparece o painel **Bling**:

1. **Conectar ao Bling** — OAuth 2.0 (authorization code). Cada vendedor autoriza uma
   vez no próprio navegador; o token fica num cookie `httpOnly` criptografado
   (AES-256-GCM) e é renovado sozinho pelo refresh token (30 dias, renovado a cada uso).
   Não há tabela de tokens no servidor.
2. **Catálogo** (`GET /api/bling/catalogo`) — todos os produtos ativos, com saldo
   virtual, classificados por slot. Uma página de 100 a cada 400 ms (o Bling limita a
   3 requisições/segundo), até 4.000 produtos, cache de 5 minutos; "recarregar" força
   uma nova leitura. Se a listagem não trouxer saldo, completa por `GET /estoques/saldos`.
3. **Escolher** — ao clicar num produto, busca o detalhe (`GET /produtos/{id}`) para
   trazer o **preço de custo** já preenchido; se o Bling não tiver custo cadastrado, avisa
   para preencher. "Buscar direto no Bling" pesquisa por nome na API, fora do cache.
4. **Atualizar estoque das peças escolhidas** (menu ⋯) — reconsulta o saldo
   (`GET /estoques/saldos`) e atualiza o selo verde/amarelo/vermelho de cada linha
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

## Deploy (Vercel)

O repositório está ligado ao projeto `agenteiapropostacomercial` na Vercel. Push na
`main` vira produção; push em qualquer outra branch gera um preview.

- Produção: <https://agenteiapropostacomercial-pedros-projects-8bfe3549.vercel.app>

Variáveis de ambiente para definir em *Settings > Environment Variables* (Production
e Preview): `ANTHROPIC_API_KEY`, `BLING_CLIENT_ID`, `BLING_CLIENT_SECRET` e,
opcionalmente, `BLING_TOKEN_SECRET`. O build não precisa de nenhuma delas; sem
`ANTHROPIC_API_KEY` a ficha de produto retorna erro ao gerar, e sem as do Bling o
montador funciona só no modo manual.

URL de redirecionamento a cadastrar no aplicativo do Bling (produção):

```
https://agenteiapropostacomercial-pedros-projects-8bfe3549.vercel.app/api/bling/callback
```

Previews têm domínio próprio a cada branch; para testar o Bling num preview, cadastre
também a URL daquele preview (o Bling aceita mais de uma) ou use o domínio de produção.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção
- `npm run lint` — ESLint
- `npm run typecheck` — checagem de tipos sem gerar build
- `npm test` — testes do motor de precificação (Node test runner, sem dependências)
- `npm run verify` — typecheck + lint + testes + build, tudo de uma vez
