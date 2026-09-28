/**
 * 冰河時期的陸橋地形。美術:public/art/terrain/<id>.webp
 * 手繪地圖一個字元一格(見 maps.ts)。
 */
import type { TerrainDef } from "./types";

export const TERRAINS: TerrainDef[] = [
  { id: "tundra", char: ".", name: "凍原", moveCost: 1, defense: 0, color: "#a9a27a", desc: "枯草與殘雪,開闊好走。" },
  { id: "snow", char: "*", name: "積雪", moveCost: 2, defense: 0, color: "#dfe6ea", desc: "雪深及膝,走得很慢。" },
  { id: "ice", char: "i", name: "冰面", moveCost: 1, defense: -0.15, color: "#bcd6e2", desc: "結冰的湖面,站不穩,承傷 +15%。" },
  { id: "basalt", char: "B", name: "玄武岩台地", moveCost: 2, defense: 0.2, highGround: true, color: "#4e4c4a", desc: "六角石柱的高台:承傷 −20%,遠程技能射程 +1。" },
  { id: "taiga", char: "T", name: "針葉林", moveCost: 2, defense: 0.25, color: "#4a6448", desc: "雪杉林的掩護,承傷 −25%。" },
  { id: "shallows", char: "=", name: "淺灘", moveCost: 3, defense: -0.1, color: "#7fa7b0", desc: "冰冷的淺水,移動很慢,承傷 +10%。" },
  { id: "marsh", char: "m", name: "凍沼", moveCost: 3, defense: -0.1, color: "#6b6a4e", desc: "結了薄冰的沼澤,一踩就陷,承傷 +10%。" },
  { id: "sea", char: "~", name: "海", moveCost: 99, defense: 0, impassable: true, color: "#35607a", desc: "冰冷的海水,無法通行。" },
  { id: "rocks", char: "R", name: "亂石", moveCost: 99, defense: 0, impassable: true, color: "#77736c", desc: "巨石堆,無法通行。" },
  { id: "campfire", char: "F", name: "營火", moveCost: 1, defense: 0.1, heal: 0.15, warding: true, color: "#c4773a", desc: "溫暖的火:每回合開始回復 15% 生命,承傷 −10%。寒祟不敢靠近。" },
];

const byId = new Map(TERRAINS.map((t) => [t.id, t]));
export const TERRAIN_BY_CHAR = new Map(TERRAINS.map((t) => [t.char, t]));

export function getTerrain(id: string): TerrainDef {
  const t = byId.get(id);
  if (!t) throw new Error(`Unknown terrain: ${id}`);
  return t;
}
