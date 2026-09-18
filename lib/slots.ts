import type { ItemCategory } from "./quote-types";

/**
 * Slots do montador de setup. Cada slot é uma categoria de peça; o vendedor
 * preenche um por um escolhendo do estoque do Bling.
 */
export type Slot = {
  id: ItemCategory;
  label: string;
  icon: string;
  /** Faz parte do "núcleo" da máquina (aparece sempre no montador). */
  core: boolean;
  /** Dica curta mostrada no slot vazio. */
  hint: string;
};

export const SLOTS: Slot[] = [
  { id: "Processador", label: "Processador", icon: "⚡", core: true, hint: "Intel Core / AMD Ryzen" },
  { id: "Placa-mãe", label: "Placa-mãe", icon: "🧩", core: true, hint: "Confira o soquete e o DDR do processador" },
  { id: "Memória RAM", label: "Memória RAM", icon: "🧠", core: true, hint: "DDR4 ou DDR5 conforme a placa-mãe" },
  { id: "Armazenamento", label: "Armazenamento", icon: "💾", core: true, hint: "SSD NVMe ou SATA" },
  { id: "Placa de vídeo", label: "Placa de vídeo", icon: "🎮", core: true, hint: "Opcional se o processador tiver vídeo integrado" },
  { id: "Fonte", label: "Fonte", icon: "🔌", core: true, hint: "Potência e certificação 80 Plus" },
  { id: "Gabinete", label: "Gabinete", icon: "🖥️", core: true, hint: "Tamanho compatível com a placa-mãe" },
  { id: "Refrigeração", label: "Refrigeração", icon: "❄️", core: true, hint: "Air cooler ou water cooler" },
  { id: "Sistema operacional", label: "Sistema operacional", icon: "🪟", core: false, hint: "Windows, licenças" },
  { id: "Monitor", label: "Monitor", icon: "🖵", core: false, hint: "" },
  { id: "Periférico", label: "Periféricos", icon: "⌨️", core: false, hint: "Teclado, mouse, headset" },
  { id: "Serviço / Montagem", label: "Serviço / Montagem", icon: "🔧", core: false, hint: "" },
  { id: "Outro", label: "Outros", icon: "📦", core: false, hint: "" },
];

export const SLOT_BY_ID = new Map(SLOTS.map((s) => [s.id, s]));

/**
 * Regras de classificação pelo nome do produto, avaliadas na ordem: a
 * primeira que casa vence. Placa de vídeo vem antes de placa-mãe e memória
 * ("RTX 4060 8GB GDDR6" não pode virar RAM), SSD vem antes de memória
 * ("SSD ... DDR" não existe, mas "memória" aparece em nomes de SSD).
 */
const RULES: { slot: ItemCategory; test: RegExp }[] = [
  { slot: "Placa de vídeo", test: /placa\s+de\s+v[ií]deo|\bvga\b|\bgpu\b|\brtx\s?\d|\bgtx\s?\d|geforce|radeon|\brx\s?\d{3,4}\b|\barc\s+[ab]\d{3}/i },
  { slot: "Monitor", test: /\bmonitor\b/i },
  { slot: "Periférico", test: /\bteclado\b|\bmouse\b|\bheadset\b|\bfone\b|\bwebcam\b|\bmousepad\b|\bkit\s+gamer\b|\bcaixa\s+de\s+som\b|\bmicrofone\b|\bcontrole\b|\bcadeira\b/i },
  // Nome que começa com cooler/fan é refrigeração mesmo citando "processador".
  { slot: "Refrigeração", test: /^\s*(water\s?cooler|air\s?cooler|cooler|fan|ventoinha|kit\s+fan)\b/i },
  { slot: "Armazenamento", test: /\bssd\b|\bnvme\b|\bm\.?2\b|\bhdd?\b|\bdisco\s+r[ií]gido|\bsata\s+iii\b|pen\s?drive/i },
  { slot: "Fonte", test: /\bfonte\b|\bpsu\b|\d{3,4}\s?w\b.*80\s?plus|80\s?plus/i },
  { slot: "Processador", test: /\bprocessador\b|\bcpu\b|\bryzen\b|\bcore\s+i[3579]\b|\bcore\s+ultra\b|\bintel\s+core\b|\bathlon\b|\bpentium\b|\bceleron\b/i },
  { slot: "Placa-mãe", test: /placa[\s-]*m[ãa]e|motherboard|\bmobo\b|\b[abhxz]\d{3}m?[\s-]|\blga\s?\d{4}\b|\bam[45]\b|\bam4\b/i },
  { slot: "Memória RAM", test: /\bmem[óo]ria\b|\bram\b|\bddr[345]\b|\bdimm\b/i },
  { slot: "Refrigeração", test: /water\s?cooler|\bcooler\b|\bfan\b|ventoinha|refrigera|dissipador|pasta\s+t[ée]rmica/i },
  { slot: "Gabinete", test: /\bgabinete\b|\bcase\b\s+gamer|\bcase\b\s+atx/i },
  { slot: "Sistema operacional", test: /\bwindows\b|\blicen[çc]a\b|\boffice\b|\bso\b\s+\d/i },
  { slot: "Serviço / Montagem", test: /\bmontagem\b|\bservi[çc]o\b|\bm[ãa]o\s+de\s+obra\b|\binstala[çc][ãa]o\b/i },
];

export function classifyProductName(name: string): ItemCategory {
  const n = name.normalize("NFC");
  for (const rule of RULES) {
    if (rule.test.test(n)) return rule.slot;
  }
  return "Outro";
}
