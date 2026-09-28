/**
 * 信物 — 每位英雄身上有三個配戴位置:
 *   額 = 神識(看穿、專注)   胸 = 信念(守護、意志)   臍 = 生命(復甦、體魄)
 * 同一件信物戴在不同位置,發揮不同的力量。
 *
 * 來源:每場戰鬥第一次勝利的獎勵;戰鬥中擊倒野獸時隨機掉落(勝利才帶得走)。
 * 「一次」的效果每場戰鬥各觸發一次。
 */
import type { CharmEffect, KeepsakeDef, SlotId } from "./types";

export const SLOTS: Array<{ id: SlotId; name: string; realm: string; desc: string }> = [
  { id: "brow", name: "額", realm: "神識", desc: "看穿與專注" },
  { id: "chest", name: "胸", realm: "信念", desc: "守護與意志" },
  { id: "navel", name: "臍", realm: "生命", desc: "復甦與體魄" },
];

export const KEEPSAKES: KeepsakeDef[] = [
  {
    id: "hyena-head",
    name: "鬣狗之首",
    lore: "巴度用石刀把鬣狗頭骨磨成的小護符,眼窩裡還塞著紅色的赭土。牠曾經那樣笑著撲上來。",
    effects: {
      brow: { effect: "sureCrit", desc: "每場第一次造成傷害,必定暴擊。" },
      chest: { effect: "dodgeOnce", desc: "每場一次:野獸的攻擊有機會落空(被攻擊時 40% 機率觸發)。" },
      navel: { effect: "reviveOnce", desc: "每場一次:倒下時立刻以 5% 生命站起來。" },
    },
  },
  {
    id: "basalt-shard",
    name: "六角石片",
    lore: "從玄武岩台地撿回來的黑色石片,正好六個邊。比杜說,它在夜裡摸起來是溫的。",
    effects: {
      brow: { effect: "freeCastOnce", desc: "每場第一次施放技能,不消耗怒氣或靈力。" },
      chest: { effect: "openGuard", desc: "戰鬥開始時進入守勢(承傷 −30%)2 回合。" },
      navel: { effect: "regen5", desc: "每回合開始回復 5% 生命。" },
    },
  },
  {
    id: "elephant-blessing",
    name: "古象神的祝福",
    lore: "古象神醒來後,在達努額前輕觸留下的一小片象牙。上面有一圈一圈的紋路,像年輪,也像漣漪。",
    effects: {
      brow: { effect: "cdMinus", desc: "所有技能冷卻 −1 回合。" },
      chest: { effect: "noCC", desc: "不會被暈眩、遲緩。" },
      navel: { effect: "hpUp15", desc: "生命上限 +15%。" },
    },
  },
  {
    id: "frost-crystal",
    name: "寒祟冰晶",
    lore: "寒祟散去後留下的一粒冰晶,放在火邊也不會融化。裡面好像有什麼東西在看著你。",
    effects: {
      brow: { effect: "spellUp10", desc: "法術傷害 +10%。" },
      chest: { effect: "chillOnce", desc: "每場第一次被攻擊時,讓攻擊者遲緩一回合。" },
      navel: { effect: "magicRes15", desc: "受到的法術傷害 −15%。" },
    },
  },
  {
    id: "tiger-claw",
    name: "雪紋虎的爪",
    lore: "那頭沉默的老虎留在岩石上的一枚斷爪。牠沒有再回來,但你知道牠一直記得你們。",
    effects: {
      brow: { effect: "executioner", desc: "對生命低於一半的敵人,傷害 +20%。" },
      chest: { effect: "moveUp", desc: "移動 +1。" },
      navel: { effect: "killHeal", desc: "擊倒敵人時回復 10% 生命。" },
    },
  },
];

const byId = new Map(KEEPSAKES.map((k) => [k.id, k]));
export function getKeepsake(id: string): KeepsakeDef {
  const k = byId.get(id);
  if (!k) throw new Error(`Unknown keepsake: ${id}`);
  return k;
}

/** 每場一次的效果(用過就記在 unit.charmUsed) */
export const ONCE_EFFECTS: CharmEffect[] = ["sureCrit", "dodgeOnce", "reviveOnce", "freeCastOnce", "chillOnce"];

/** 野獸掉落:擊倒時的機率 */
export const DROPS: Record<string, Array<{ keepsake: string; chance: number }>> = {
  hyena: [{ keepsake: "hyena-head", chance: 0.06 }],
  grayfang: [{ keepsake: "hyena-head", chance: 0.5 }],
  tiger: [{ keepsake: "tiger-claw", chance: 0.6 }],
  wisp: [{ keepsake: "frost-crystal", chance: 0.12 }],
};

/** 某個效果來自哪件信物、哪個位置(戰場上顯示用) */
export function charmInfo(effect: CharmEffect): { keepsake: KeepsakeDef; slot: SlotId; desc: string } | null {
  for (const k of KEEPSAKES)
    for (const slot of ["brow", "chest", "navel"] as SlotId[])
      if (k.effects[slot].effect === effect) return { keepsake: k, slot, desc: k.effects[slot].desc };
  return null;
}
