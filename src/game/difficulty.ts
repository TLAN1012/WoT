/** 難度:同一張地圖、同一批敵人,調整敵人強度、AI 精明程度與能否悔棋。 */
import type { DifficultyDef, DifficultyId } from "./types";

export const DIFFICULTIES: DifficultyDef[] = [
  { id: "gentle", name: "溫和", desc: "第一次玩戰棋。野獸較弱、常常犯錯,而且可以悔棋。", enemyHp: 0.85, enemyDmg: 0.85, aiSkill: 0.45, allowUndo: true },
  { id: "brave", name: "勇者", desc: "標準難度。野獸會圍攻體弱的人。", enemyHp: 1, enemyDmg: 1, aiSkill: 0.8, allowUndo: false },
  { id: "legend", name: "傳說", desc: "野獸更強、更聰明。每一步站位都要想清楚。", enemyHp: 1.25, enemyDmg: 1.2, aiSkill: 1, allowUndo: false },
];

const byId = new Map(DIFFICULTIES.map((d) => [d.id, d]));
export function getDifficulty(id: DifficultyId): DifficultyDef {
  return byId.get(id) ?? byId.get("brave")!;
}
