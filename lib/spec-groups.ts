import type { FullSpecItem } from "./types";

/** Agrupa categorias da ficha técnica em seções, como as páginas de produto da Dell/Lenovo. */
const GROUP_RULES: { test: RegExp; group: string }[] = [
  { test: /processador|placa de v[íi]deo|sistema operacional/i, group: "Performance" },
  { test: /mem[oó]ria|armazenamento/i, group: "Memória e Armazenamento" },
  { test: /placa[- ]m[ãa]e|fonte|gabinete|refrigera/i, group: "Estrutura e Energia" },
];

const FALLBACK_GROUP = "Outros";

export function groupFullSpecs(
  fullSpecs: FullSpecItem[]
): { group: string; items: FullSpecItem[] }[] {
  const order = ["Performance", "Memória e Armazenamento", "Estrutura e Energia", FALLBACK_GROUP];
  const byGroup = new Map<string, FullSpecItem[]>();

  for (const item of fullSpecs) {
    const rule = GROUP_RULES.find((r) => r.test.test(item.label));
    const group = rule ? rule.group : FALLBACK_GROUP;
    if (!byGroup.has(group)) byGroup.set(group, []);
    byGroup.get(group)!.push(item);
  }

  return order
    .filter((group) => byGroup.has(group))
    .map((group) => ({ group, items: byGroup.get(group)! }));
}
