import type { Category } from "./types";

export const CATEGORIES: Category[] = [
  { slug: "colecionaveis", label: "Colecionáveis", emoji: "🦾" },
  { slug: "camisetas", label: "Camisetas", emoji: "👕" },
  { slug: "jogos", label: "Jogos de Tabuleiro", emoji: "🎲" },
  { slug: "games", label: "Games & Acessórios", emoji: "🎮" },
  { slug: "canecas", label: "Canecas", emoji: "☕" },
  { slug: "papelaria", label: "Papelaria Geek", emoji: "📓" },
  { slug: "quadrinhos", label: "Quadrinhos & Mangás", emoji: "📚" },
];

type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  emoji: string;
  featured?: boolean;
  stock?: number;
};

export const SEED_PRODUCTS: SeedProduct[] = [
  {
    slug: "action-figure-cavaleiro-das-sombras",
    name: "Action Figure Cavaleiro das Sombras",
    description:
      "Boneco articulado de 18cm com mais de 20 pontos de articulação, acabamento premium e base de exibição inclusa.",
    category: "colecionaveis",
    priceCents: 24990,
    emoji: "🦾",
    featured: true,
  },
  {
    slug: "funko-piloto-galactico",
    name: "Funko Piloto Galáctico",
    description: "Colecionável estilizado em vinil, edição de prateleira com caixa em janela.",
    category: "colecionaveis",
    priceCents: 12990,
    emoji: "👨‍🚀",
    featured: true,
  },
  {
    slug: "estatua-dragao-ancestral",
    name: "Estátua Dragão Ancestral",
    description: "Resina pintada à mão, 25cm de altura, peça de exibição para colecionadores.",
    category: "colecionaveis",
    priceCents: 39990,
    emoji: "🐉",
  },
  {
    slug: "camiseta-invasao-pixel",
    name: "Camiseta Invasão Pixel",
    description: "100% algodão premium, estampa de invasores 8-bit que não desbota na lavagem.",
    category: "camisetas",
    priceCents: 8990,
    emoji: "👾",
    featured: true,
  },
  {
    slug: "camiseta-circuito-neon",
    name: "Camiseta Circuito Neon",
    description: "Estampa de placa-mãe com tinta que brilha sob luz negra. Corte unissex.",
    category: "camisetas",
    priceCents: 9490,
    emoji: "🖥️",
  },
  {
    slug: "camiseta-portal-dimensional",
    name: "Camiseta Portal Dimensional",
    description: "Malha macia com estampa frente e costas, ideal pra maratona de séries.",
    category: "camisetas",
    priceCents: 8490,
    emoji: "🌀",
  },
  {
    slug: "jogo-tabuleiro-conquista-estelar",
    name: "Conquista Estelar - Jogo de Tabuleiro",
    description:
      "Estratégia 4X para 2 a 5 jogadores, partidas de 90 minutos, miniaturas detalhadas inclusas.",
    category: "jogos",
    priceCents: 29990,
    emoji: "🚀",
    featured: true,
  },
  {
    slug: "jogo-cartas-duelo-arcano",
    name: "Duelo Arcano - Jogo de Cartas",
    description: "Deck building rápido de magos, 20 minutos por partida, ótimo pra iniciantes.",
    category: "jogos",
    priceCents: 11990,
    emoji: "🧙",
  },
  {
    slug: "quebra-cabeca-nebulosa",
    name: "Quebra-Cabeça Nebulosa 1000 Peças",
    description: "Imagem de nebulosa em alta definição, peças com encaixe reforçado.",
    category: "jogos",
    priceCents: 7990,
    emoji: "🧩",
  },
  {
    slug: "controle-arcade-retro",
    name: "Controle Arcade Retrô USB",
    description: "Fliperama de mesa compacto, botões arcade originais, plug-and-play em PC e TV.",
    category: "games",
    priceCents: 34990,
    emoji: "🕹️",
    featured: true,
  },
  {
    slug: "mousepad-galaxia-xl",
    name: "Mousepad Galáxia XL",
    description: "90x40cm, base emborrachada antiderrapante, bordas costuradas.",
    category: "games",
    priceCents: 6990,
    emoji: "🌌",
  },
  {
    slug: "headset-comando-tatico",
    name: "Headset Comando Tático",
    description: "Som surround virtual 7.1, microfone retrátil com cancelamento de ruído.",
    category: "games",
    priceCents: 24990,
    emoji: "🎧",
  },
  {
    slug: "caneca-termossensivel-nave",
    name: "Caneca Termossensível Nave-Mãe",
    description: "Estampa que muda de cor com o café quente. Cerâmica 325ml.",
    category: "canecas",
    priceCents: 5990,
    emoji: "☕",
    featured: true,
  },
  {
    slug: "caneca-pixel-8bit",
    name: "Caneca Pixel Coração 8-Bit",
    description: "Design retrô gamer, alça reforçada, vai no micro-ondas e lava-louças.",
    category: "canecas",
    priceCents: 4990,
    emoji: "💾",
  },
  {
    slug: "caderno-grimorio-arcano",
    name: "Caderno Grimório Arcano",
    description: "Capa dura texturizada, 200 páginas pautadas, elástico fecho e marcador de página.",
    category: "papelaria",
    priceCents: 5490,
    emoji: "📓",
  },
  {
    slug: "kit-adesivos-nerd-pack",
    name: "Kit Adesivos Nerd Pack",
    description: "50 adesivos vinílicos à prova d'água com temas de games, filmes e séries.",
    category: "papelaria",
    priceCents: 2990,
    emoji: "🏷️",
  },
  {
    slug: "hq-guardioes-do-multiverso-vol1",
    name: "Guardiões do Multiverso Vol. 1",
    description: "Edição encadernada colorida, 180 páginas, primeira saga completa.",
    category: "quadrinhos",
    priceCents: 6990,
    emoji: "📖",
  },
  {
    slug: "mangatilha-lamina-de-lua-vol1",
    name: "Lâmina de Lua Vol. 1",
    description: "Mangá de ação sobrenatural, impressão nacional, capa com acabamento fosco.",
    category: "quadrinhos",
    priceCents: 3490,
    emoji: "🌙",
    featured: true,
  },
];
