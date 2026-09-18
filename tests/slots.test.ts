import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyProductName } from "../lib/slots.ts";

const cases: [string, string][] = [
  ["Processador Intel Core i5-14400F 2.5GHz LGA 1700", "Processador"],
  ["PROCESSADOR AMD RYZEN 5 5600G 3.9GHZ AM4", "Processador"],
  ["Placa Mãe Gigabyte B860M Eagle WiFi6 DDR5 LGA 1851", "Placa-mãe"],
  ["PLACA MAE ASUS PRIME A520M-K AM4 DDR4", "Placa-mãe"],
  ["Memória Kingston Fury Beast 16GB DDR5 5600MHz", "Memória RAM"],
  ["32gb ddr5", "Memória RAM"],
  ["SSD Kingston NV3 1TB M.2 2280 NVMe PCIe 4.0", "Armazenamento"],
  ["Ssd Kingston 480GB Sata III A400 SA400S37/480G Preto", "Armazenamento"],
  ["HD Seagate Barracuda 2TB 7200RPM", "Armazenamento"],
  ["Placa de Vídeo Asus RTX 4060 Dual 8GB GDDR6", "Placa de vídeo"],
  ["GeForce RTX 3050 6GB", "Placa de vídeo"],
  ["Placa de vídeo AMD Radeon RX 7600 8GB", "Placa de vídeo"],
  ["FONTE C3TECH PS-G1000 1000W 80 PLUS GOLD", "Fonte"],
  ["Fonte Corsair CV650 650W 80 Plus Bronze", "Fonte"],
  ["Gabinete Gamer Rise Mode Galaxy Glass Preto", "Gabinete"],
  ["Water Cooler Rise Mode Frost 240mm", "Refrigeração"],
  ["Cooler para processador DeepCool AG400", "Refrigeração"],
  ["Monitor Gamer LG 24 165Hz Full HD", "Monitor"],
  ["Teclado Mecânico Redragon Kumara", "Periférico"],
  ["Windows 11 Pro Licença Digital", "Sistema operacional"],
  ["Serviço de montagem e testes", "Serviço / Montagem"],
  ["Cabo HDMI 2.0 2m", "Outro"],
];

for (const [name, expected] of cases) {
  test(`classifica "${name}" como ${expected}`, () => {
    assert.equal(classifyProductName(name), expected);
  });
}
