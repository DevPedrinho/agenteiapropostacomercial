export type SpecItem = {
  label: string;
  value: string;
};

/** What the user fills in the form. */
export type ProductSpecInput = {
  productName: string;
  specs: SpecItem[];
  audience: string;
  notes: string;
};

/**
 * Style-independent content for a proposal sheet. Generated once by the
 * API; each output style is a pure render of this same object, so switching
 * styles never needs a new generation call.
 */
export type ProposalContent = {
  productName: string;
  skuLine: string;
  positioning: string;
  quickView: SpecItem[];
  fullSpecs: SpecItem[];
  whyThisConfig: string[];
  indicatedFor: string[];
};

export type ProposalStyle = "comercial" | "executivo" | "compacto";

export const PROPOSAL_STYLES: { id: ProposalStyle; label: string; hint: string }[] = [
  {
    id: "comercial",
    label: "Comercial",
    hint: "Com emoji e réguas visuais. Ideal para e-mail e proposta em PDF quando o gerador renderiza emoji corretamente.",
  },
  {
    id: "executivo",
    label: "Executivo",
    hint: "Sem nenhum emoji, tom sóbrio. Use este estilo para licitação, departamento de TI, ou se o PDF do Bling trocar emoji por quadradinho.",
  },
  {
    id: "compacto",
    label: "Compacto",
    hint: "Versão curta para WhatsApp: só o essencial para decidir rápido.",
  },
];
