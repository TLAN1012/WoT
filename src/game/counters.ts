/**
 * 相剋:五種戰型繞成一圈,每一型剋下一型、被上一型剋,其餘不相干。
 *
 *   斧 → 獸 → 弓 → 靈 → 巨 → 斧
 *   斧劈獸(巴度專打野獸)、獸撲弓(射手來不及拉開距離)、弓射靈(箭打斷施法)、
 *   靈咒巨(法術穿透厚皮,淨化神獸)、巨踏斧(巨獸踩扁近戰)
 */
import type { CombatType } from "./types";

export const CTYPES: CombatType[] = ["axe", "beast", "bow", "spirit", "giant"];

export const CTYPE_INFO: Record<CombatType, { name: string; icon: string; color: string; desc: string }> = {
  axe: { name: "斧", icon: "🪓", color: "#c0532f", desc: "近身搏鬥的戰士。剋野獸,怕巨獸。" },
  beast: { name: "獸", icon: "🐾", color: "#b08a3a", desc: "迅捷的野獸。剋弓手,怕斧。" },
  bow: { name: "弓", icon: "🏹", color: "#5b8a3a", desc: "遠射的獵手。剋術者,怕野獸。" },
  spirit: { name: "靈", icon: "✨", color: "#4a63b8", desc: "施法與通靈的人。剋巨獸,怕弓。" },
  giant: { name: "巨", icon: "⛰️", color: "#6b5a8a", desc: "巨大厚重的存在。剋斧,怕靈。" },
};

export const COUNTER_BONUS = 1.35;
export const COUNTERED_PENALTY = 0.8;

/** a 剋 b */
export function beats(a: CombatType, b: CombatType): boolean {
  return CTYPES[(CTYPES.indexOf(a) + 1) % CTYPES.length] === b;
}

export function counterMultiplier(att?: CombatType, def?: CombatType): number {
  if (!att || !def) return 1;
  if (beats(att, def)) return COUNTER_BONUS;
  if (beats(def, att)) return COUNTERED_PENALTY;
  return 1;
}

export function counterLabel(att?: CombatType, def?: CombatType): "剋制" | "被剋" | null {
  const m = counterMultiplier(att, def);
  return m > 1 ? "剋制" : m < 1 ? "被剋" : null;
}
