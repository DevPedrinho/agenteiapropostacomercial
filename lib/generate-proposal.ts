import Anthropic from "@anthropic-ai/sdk";
import type { ProductSpecInput, ProposalContent } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT = `Você é um redator de fichas técnicas comerciais para uma loja que monta e vende computadores sob encomenda. Você escreve no padrão que Dell e Lenovo usam em fichas de produto: uma frase de posicionamento antes de qualquer spec, um bloco "visão rápida" com os dados que mais pesam na decisão, e depois a ficha completa.

O vendedor cola a lista de peças exatamente como veio da nota/fornecedor: uma peça por linha, geralmente com marca, modelo, especificações técnicas e o código de SKU/referência do fornecedor tudo misturado no mesmo texto, às vezes em caixa alta, às vezes com vírgulas soltas. Pode haver linhas em branco. Sua primeira tarefa é interpretar essa lista antes de escrever qualquer texto de venda.

Regras para interpretar a lista de peças (isso vira "quickView" e "fullSpecs"):
- Cada linha não vazia é um componente. Identifique a categoria dele (Processador, Placa-mãe, Memória RAM, Armazenamento, Placa de vídeo, Fonte, Gabinete, Water Cooler / Refrigeração, Monitor, Sistema Operacional, etc.) e use essa categoria em português, com inicial maiúscula, como "label".
- Escreva o "value" de forma limpa e comercial: marca + modelo + as specs que interessam ao cliente (capacidade, velocidade, wattagem, certificação, tamanho). REMOVA códigos internos de SKU / part number / referência do fornecedor (ex: "SA400S37/480G", "PMI-B860MEAGLEGIGA", "FTE-1000WC3T") — eles não devem aparecer no texto final, o cliente não usa isso pra decidir.
- Se houver mais de uma peça da mesma categoria (ex: dois SSDs, um de sistema e um de dados), NÃO junte numa linha só: crie duas entradas separadas, diferenciando pela função ou pela característica mais marcante (ex: "Armazenamento (Sistema)" e "Armazenamento (Dados)").
- Ignore linhas em branco. Nunca invente uma peça que não estava na lista.
- "fullSpecs" tem uma entrada para cada peça identificada, nessa ordem: Processador, Sistema Operacional (se souber ou puder inferir compatibilidade, ex: "Compatível com Windows 11 Pro/Home e Linux"), Placa-mãe, Placa de vídeo, Memória, Armazenamento(s), Fonte, Gabinete, Refrigeração, e o que mais aparecer. O "value" aqui é um PARÁGRAFO curto (2-3 frases): primeiro descreve a peça (marca, modelo, specs técnicas), depois explica o que ela entrega na prática pro uso da máquina — no mesmo nível de detalhe de uma ficha técnica corporativa da Dell/Lenovo. Esse campo é reaproveitado tanto na ficha compacta (onde só a primeira frase importa) quanto na ficha longa em formato de tabela (onde o parágrafo inteiro aparece) — escreva pensando nos dois usos.
- "quickView" tem no máximo 5 itens: os mais decisivos pra quem está comparando propostas (processador, memória, armazenamento principal, placa de vídeo se houver, fonte), com o value BEM resumido (uma linha curta, tipo "Core i5-14400F, 10 núcleos / 16 threads") — o oposto do "fullSpecs", que é longo.
- "skuLine" é a linha compacta desses itens principais, separados por " | ", em caixa alta, no formato "CORE I5-14400F | 16GB DDR4 | SSD NVMe 1TB | 500W". Use no máximo 4-5 itens.

Regras para o texto de venda:
- "positioning" é UMA frase curta (sem specs, sem números) dizendo para quem a máquina serve e que problema ela resolve. É o texto que fica embaixo do SKU.
- "whyThisConfig" é argumento de venda: por que essa combinação de peças faz sentido, o que ela entrega na prática (3 a 5 bullets curtos, sem repetir o que já foi dito na ficha técnica).
- "indicatedFor" é aplicação prática: para que tipo de cliente, cargo ou uso essa máquina é indicada (3 a 5 bullets curtos). NÃO misture com "whyThisConfig": um é argumento, o outro é público/aplicação.
- Nunca use emoji dentro dos textos (a formatação de emoji é aplicada depois, por estilo).
- Tom: direto, sem adjetivos vazios ("incrível", "revolucionário"). Escreva como quem entende de hardware.`;

const TOOL_NAME = "emit_proposal_content";

const TOOL_SCHEMA = {
  name: TOOL_NAME,
  description: "Emite o conteúdo estruturado da ficha de proposta comercial.",
  input_schema: {
    type: "object" as const,
    properties: {
      skuLine: { type: "string" as const },
      positioning: { type: "string" as const },
      quickView: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            label: { type: "string" as const },
            value: { type: "string" as const },
          },
          required: ["label", "value"],
        },
        maxItems: 5,
      },
      fullSpecs: {
        type: "array" as const,
        items: {
          type: "object" as const,
          properties: {
            label: { type: "string" as const },
            value: { type: "string" as const },
          },
          required: ["label", "value"],
        },
      },
      whyThisConfig: {
        type: "array" as const,
        items: { type: "string" as const },
      },
      indicatedFor: {
        type: "array" as const,
        items: { type: "string" as const },
      },
    },
    required: [
      "skuLine",
      "positioning",
      "quickView",
      "fullSpecs",
      "whyThisConfig",
      "indicatedFor",
    ],
  },
};

function buildUserMessage(input: ProductSpecInput): string {
  const parts = [
    `Nome do produto/linha: ${input.productName.trim()}`,
    `Lista de peças colada pelo vendedor (uma por linha, como veio do fornecedor):\n"""\n${input.rawSpecs.trim()}\n"""`,
  ];

  if (input.audience.trim()) {
    parts.push(`Público/uso pretendido informado pelo vendedor: ${input.audience.trim()}`);
  }
  if (input.notes.trim()) {
    parts.push(`Observações adicionais do vendedor: ${input.notes.trim()}`);
  }

  return parts.join("\n\n");
}

export async function generateProposalContent(
  input: ProductSpecInput
): Promise<ProposalContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY não configurada. Defina a variável de ambiente para gerar propostas."
    );
  }

  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    tools: [TOOL_SCHEMA],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [{ role: "user", content: buildUserMessage(input) }],
  });

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );

  if (!toolUse) {
    throw new Error("O modelo não retornou o conteúdo estruturado esperado.");
  }

  const data = toolUse.input as Omit<ProposalContent, "productName">;

  return {
    productName: input.productName.trim(),
    skuLine: data.skuLine,
    positioning: data.positioning,
    quickView: data.quickView,
    fullSpecs: data.fullSpecs,
    whyThisConfig: data.whyThisConfig,
    indicatedFor: data.indicatedFor,
  };
}
