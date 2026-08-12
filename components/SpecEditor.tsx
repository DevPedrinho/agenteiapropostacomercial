"use client";

import type { ProductSpecInput, SpecItem } from "@/lib/types";

type Props = {
  value: ProductSpecInput;
  onChange: (value: ProductSpecInput) => void;
  onSubmit: () => void;
  loading: boolean;
};

function updateSpec(specs: SpecItem[], index: number, patch: Partial<SpecItem>): SpecItem[] {
  return specs.map((s, i) => (i === index ? { ...s, ...patch } : s));
}

export default function SpecEditor({ value, onChange, onSubmit, loading }: Props) {
  const canSubmit =
    value.productName.trim().length > 0 &&
    value.specs.some((s) => s.label.trim() && s.value.trim()) &&
    !loading;

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
        <label>Specs</label>
        {value.specs.map((spec, i) => (
          <div className="spec-row" key={i}>
            <input
              value={spec.label}
              onChange={(e) => onChange({ ...value, specs: updateSpec(value.specs, i, { label: e.target.value }) })}
              placeholder="Ex: Processador"
            />
            <input
              value={spec.value}
              onChange={(e) => onChange({ ...value, specs: updateSpec(value.specs, i, { value: e.target.value }) })}
              placeholder="Ex: Core i5-14400F"
            />
            <button
              type="button"
              className="btn-remove"
              aria-label="Remover spec"
              onClick={() =>
                onChange({ ...value, specs: value.specs.filter((_, idx) => idx !== i) })
              }
            >
              ×
            </button>
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary"
          onClick={() => onChange({ ...value, specs: [...value.specs, { label: "", value: "" }] })}
        >
          + Adicionar spec
        </button>
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
