import Anthropic from "@anthropic-ai/sdk";
import type { ProductSpecInput, ProposalContent } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";

const SYSTEM_PROMPT = `Você é um redator de fichas técnicas comerciais para uma loja que monta e vende computadores sob encomenda. Você escreve no padrão que Dell e Lenovo usam em fichas de produto: uma frase de posicionamento antes de qualquer spec, um bloco "visão rápida" com os dados que mais pesam na decisão, e depois a ficha completa.

Regras de conteúdo:
- "positioning" é UMA frase curta (sem specs, sem números) dizendo para quem a máquina serve e que problema ela resolve. É o texto que fica embaixo do SKU.
- "skuLine" é a linha compacta de specs separadas por " | ", no formato que aparece em caixa alta para os itens principais (ex: "CORE I5-14400F | 16GB DDR4 | SSD NVMe 1TB | 500W"). Use no máximo 4-5 itens, os mais decisivos.
- "quickView" tem no máximo 5 itens: os specs mais decisivos para quem está comparando propostas, com o valor escrito de forma um pouco mais completa que o skuLine (ex: "Core i5-14400F, 10 núcleos / 16 threads").
- "fullSpecs" tem TODOS os specs informados pelo usuário, um item por spec, com o valor detalhado.
- "whyThisConfig" é argumento de venda: por que essa combinação de peças faz sentido, o que ela entrega na prática (3 a 5 bullets curtos, sem repetir o que já foi dito na ficha técnica).
- "indicatedFor" é aplicação prática: para que tipo de cliente, cargo ou uso essa máquina é indicada (3 a 5 bullets curtos). NÃO misture com "whyThisConfig": um é argumento, o outro é público/aplicação.
- Nunca invente specs que o usuário não informou. Nunca use emoji dentro dos textos (a formatação de emoji é aplicada depois, por estilo).
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
  const specsList = input.specs
    .filter((s) => s.label.trim() && s.value.trim())
    .map((s) => `- ${s.label.trim()}: ${s.value.trim()}`)
    .join("\n");

  const parts = [
    `Nome do produto/linha: ${input.productName.trim()}`,
    `Specs informados:\n${specsList}`,
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
