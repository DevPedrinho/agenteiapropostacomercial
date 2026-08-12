/** Maps a spec label to a fitting emoji for the Comercial/Compacto styles. */
const LABEL_ICON_RULES: { test: RegExp; icon: string }[] = [
  { test: /processador|cpu/i, icon: "⚡" },
  { test: /mem[oó]ria|ram/i, icon: "🧠" },
  { test: /armazenamento|ssd|hd|nvme|disco/i, icon: "💾" },
  { test: /placa de v[íi]deo|gpu|gr[áa]fic/i, icon: "🎮" },
  { test: /fonte|psu|energia/i, icon: "🔌" },
  { test: /gabinete|case/i, icon: "📦" },
  { test: /monitor|tela|display/i, icon: "🖥️" },
  { test: /placa[- ]m[ãa]e|motherboard/i, icon: "🔧" },
  { test: /rede|wi[- ]?fi|ethernet/i, icon: "🌐" },
  { test: /sistema|windows|linux|os\b/i, icon: "💿" },
  { test: /refrigera|cooler|water ?cool/i, icon: "❄️" },
  { test: /garantia/i, icon: "🛡️" },
  { test: /pre[çc]o|valor|investimento/i, icon: "💰" },
];

const DEFAULT_ICON = "▪";

export function getSpecIcon(label: string): string {
  const rule = LABEL_ICON_RULES.find((r) => r.test.test(label));
  return rule ? rule.icon : DEFAULT_ICON;
}

export const SECTION_ICONS = {
  title: "🖥️",
  quickView: "⚡",
  fullSpecs: "📋",
  whyThisConfig: "✔️",
  indicatedFor: "🎯",
} as const;
