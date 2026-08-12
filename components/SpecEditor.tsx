"use client";

import type { ProductSpecInput } from "@/lib/types";

type Props = {
  value: ProductSpecInput;
  onChange: (value: ProductSpecInput) => void;
  onSubmit: () => void;
  loading: boolean;
};

const RAW_SPECS_PLACEHOLDER = `Cole aqui a lista de peças, uma por linha, do jeito que veio da nota/fornecedor:

Ssd Kingston 480GB Sata III A400 SA400S37/480G Preto
PLACA MAE B860M EAGLE WIFI6 V2 1.0 GIGABYTE, DDR5, LGA 1851, PMI-B860MEAGLEGIGA
32gb ddr5
SSD 1TB KINGSTON SNV3S/1000G, M.2 2280, PCIE 4.0...
FONTE C3TECH PS-G1000 1000W, 80 PLUS GOLD...`;

export default function SpecEditor({ value, onChange, onSubmit, loading }: Props) {
  const canSubmit =
    value.productName.trim().length > 0 && value.rawSpecs.trim().length > 0 && !loading;

  return (
    <section className="panel">
      <h2>Dados do produto</h2>

      <div className="field">
        <label htmlFor="productName">Nome do produto / linha</label>
        <input
          id="productName"
          value={value.productName}
          onChange={(e) => onChange({ ...value, productName: e.target.value })}
          placeholder="Ex: UPAR ENTERPRISE"
        />
      </div>

      <div className="field">
        <label htmlFor="rawSpecs">Lista de peças</label>
        <textarea
          id="rawSpecs"
          rows={12}
          value={value.rawSpecs}
          onChange={(e) => onChange({ ...value, rawSpecs: e.target.value })}
          placeholder={RAW_SPECS_PLACEHOLDER}
        />
        <p className="field-hint">
          Pode colar direto da nota ou do orçamento do fornecedor — nome completo, marca, modelo e
          código de SKU misturados. A IA identifica cada peça e limpa o texto sozinha.
        </p>
      </div>

      <div className="field">
        <label htmlFor="audience">Público / uso pretendido (opcional)</label>
        <input
          id="audience"
          value={value.audience}
          onChange={(e) => onChange({ ...value, audience: e.target.value })}
          placeholder="Ex: equipes que trabalham o dia inteiro"
        />
      </div>

      <div className="field">
        <label htmlFor="notes">Observações adicionais (opcional)</label>
        <textarea
          id="notes"
          rows={3}
          value={value.notes}
          onChange={(e) => onChange({ ...value, notes: e.target.value })}
          placeholder="Diferenciais, preço, prazo de entrega, garantia..."
        />
      </div>

      <button className="btn" onClick={onSubmit} disabled={!canSubmit}>
        {loading ? "Gerando..." : "Gerar proposta"}
      </button>
    </section>
  );
}
