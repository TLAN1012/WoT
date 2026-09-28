/**
 * 材料與信物升級。
 * 信物 Lv1~5:原本的特殊效果不變,另外依配戴位置加數值——
 *   額(神識)每級 +4% 傷害   胸(信念)每級 −4% 承傷   臍(生命)每級 +6% 生命上限
 */
import type { MaterialId, SlotId } from "./types";

export const MATERIALS: Record<MaterialId, { name: string; rarity: string; desc: string }> = {
  flint: { name: "燧石", rarity: "常見", desc: "敲得出鋒利刃口的燧石片。" },
  shell: { name: "貝殼", rarity: "常見", desc: "海邊與沼澤撿來的貝殼。" },
  antler: { name: "鹿角", rarity: "少見", desc: "水鹿脫下的鹿角,可以磨成工具與飾品。" },
  obsidian: { name: "黑曜石", rarity: "稀有", desc: "漆黑發亮的火山玻璃,比杜的杖頭就是它。只有 3★ 試煉找得到。" },
};
export const MATERIAL_IDS = Object.keys(MATERIALS) as MaterialId[];

export const MAX_KEEPSAKE_LEVEL = 5;

/** 升到下一級要的材料(索引 = 目前等級) */
export const UPGRADE_COST: Record<number, Partial<Record<MaterialId, number>>> = {
  1: { flint: 3 },
  2: { flint: 4, shell: 4 },
  3: { shell: 6, antler: 3 },
  4: { antler: 5, obsidian: 1 },
};

export const SLOT_BONUS: Record<SlotId, { per: number; label: (n: number) => string }> = {
  brow: { per: 0.04, label: (n) => `傷害 +${Math.round(n * 100)}%` },
  chest: { per: 0.04, label: (n) => `承傷 −${Math.round(n * 100)}%` },
  navel: { per: 0.06, label: (n) => `生命 +${Math.round(n * 100)}%` },
};

/** 某等級的信物戴在某位置的數值加成 */
export function slotBonus(slot: SlotId, level: number): number {
  return SLOT_BONUS[slot].per * Math.max(0, level - 1);
}

/** 試煉掉落:依難度與這關的主材料 */
export function rollMaterials(main: MaterialId, tier: number, rand: () => number): Partial<Record<MaterialId, number>> {
  const out: Partial<Record<MaterialId, number>> = {};
  const add = (m: MaterialId, n: number) => n > 0 && (out[m] = (out[m] ?? 0) + n);
  const common = main === "antler" || main === "obsidian" ? (rand() < 0.5 ? "flint" : "shell") : main;
  add(common, 1 + tier + Math.floor(rand() * 2));
  if (main === "antler") add("antler", tier >= 2 ? 1 + Math.floor(rand() * tier) : rand() < 0.5 ? 1 : 0);
  else if (tier >= 2 && rand() < 0.45 * tier) add("antler", 1);
  if (tier === 3 && rand() < (main === "obsidian" ? 0.6 : 0.25)) add("obsidian", 1);
  return out;
}
