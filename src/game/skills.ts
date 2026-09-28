/**
 * 技能 — 每個技能有自己的「形狀」:
 *   single 單體   cleave 前方三格弧   ring 身邊一圈   line 直線貫穿
 *   blast  範圍爆炸   chain 連鎖跳躍   dash 直線衝撞(移動到目標面前再打,並擊退)
 */
import { HEX_DIRECTIONS, hexAdd, hexDistance, hexEq, hexKey, hexNeighbors, type Hex } from "../engine/hex";
import type { SkillDef } from "./types";

export const SKILLS: SkillDef[] = [
  // ── Kapah 巴度 ──
  { id: "axe", name: "石斧劈", icon: "🪓", desc: "用石斧重擊相鄰的敵人。命中時累積怒氣。", cost: 0, cooldown: 0, target: "enemy", range: [1, 1], shape: "single", effect: "damage", scale: "phys", power: 1 },
  { id: "whirl", name: "旋風斧", icon: "🌀", desc: "掄起石斧轉一圈,打中身邊所有敵人。", cost: 30, cooldown: 0, target: "self", range: [0, 0], shape: "ring", effect: "damage", scale: "phys", power: 0.75 },
  { id: "charge", name: "猛撞", icon: "💥", desc: "直線衝向 2~4 格外的敵人,撞擊並把牠擊退一格。途中不能有阻擋。", cost: 25, cooldown: 2, target: "enemy", range: [2, 4], shape: "dash", effect: "damage", scale: "phys", power: 1.2, knockback: 1 },
  { id: "roar", name: "戰吼", icon: "📣", desc: "怒吼挑釁:3 格內的野獸只能攻擊巴度,巴度承傷 −30%,持續 2 回合。", cost: 20, cooldown: 3, target: "self", range: [0, 0], shape: "ring", size: 3, effect: "buff", scale: "phys", power: 0, statuses: [{ id: "taunt", turns: 2 }], selfStatuses: [{ id: "guard", turns: 2 }] },
  // ── Inibs 達努 ──
  { id: "bell", name: "骨鈴", icon: "🔔", desc: "搖響骨鈴,以靈力震擊 1~2 格內的敵人。", cost: 0, cooldown: 0, target: "enemy", range: [1, 2], shape: "single", effect: "damage", scale: "magic", power: 0.8 },
  { id: "breath", name: "祖靈之息", icon: "🌿", desc: "請祖靈的氣息治療 3 格內的一位同伴(也可以是自己)。", cost: 6, cooldown: 0, target: "ally", range: [0, 3], shape: "single", effect: "heal", scale: "heal", power: 1.3 },
  { id: "totem", name: "靈木圖騰", icon: "🗿", desc: "在 1~2 格內的空地立起圖騰 3 回合:每回合治療相鄰同伴,相鄰同伴承傷 −20%。", cost: 10, cooldown: 3, target: "empty", range: [1, 2], shape: "single", effect: "summon", scale: "heal", power: 0, summon: "totem" },
  { id: "drum", name: "雷鼓", icon: "🥁", desc: "擊鼓引雷,連鎖打中最多 3 個相近的敵人(每跳威力 −25%),第一個目標行動遲緩。", cost: 10, cooldown: 2, target: "enemy", range: [1, 3], shape: "chain", size: 3, effect: "damage", scale: "magic", power: 1.1, statuses: [{ id: "slow", turns: 1 }] },
  // ── Rikat 比杜 ──
  { id: "mote", name: "星屑", icon: "✨", desc: "朝 1~3 格內的敵人擲出星屑。", cost: 0, cooldown: 0, target: "enemy", range: [1, 3], shape: "single", effect: "damage", scale: "magic", power: 0.9 },
  { id: "bolt", name: "落雷", icon: "⚡", desc: "召來一道閃電(Rikat),重擊 1~4 格內的單一敵人。", cost: 8, cooldown: 0, target: "enemy", range: [1, 4], shape: "single", effect: "damage", scale: "magic", power: 1.45 },
  { id: "frostline", name: "寒星貫", icon: "❄️", desc: "射出一道寒星,沿直線貫穿 3 格,命中者行動遲緩。只能朝六個正方向施放。", cost: 8, cooldown: 1, target: "enemy", range: [1, 3], shape: "line", size: 3, effect: "damage", scale: "magic", power: 1.1, statuses: [{ id: "slow", turns: 1 }] },
  { id: "meteor", name: "流星雨", icon: "☄️", desc: "星星墜落在 2~4 格外,打中目標格與周圍一圈。", cost: 12, cooldown: 3, target: "enemy", range: [2, 4], shape: "blast", size: 1, effect: "damage", scale: "magic", power: 1.2 },
  // ── Hanup 瑪塔 ──
  { id: "arrow", name: "射擊", icon: "🏹", desc: "朝 1~4 格內的敵人射一箭。", cost: 0, cooldown: 0, target: "enemy", range: [1, 4], shape: "single", effect: "damage", scale: "phys", power: 1 },
  { id: "pierce", name: "穿雲箭", icon: "🎯", desc: "一箭沿直線貫穿 4 格。只能朝六個正方向。", cost: 30, cooldown: 1, target: "enemy", range: [1, 4], shape: "line", size: 4, effect: "damage", scale: "phys", power: 1 },
  { id: "mark", name: "獵人標記", icon: "🔻", desc: "在 5 格內的獵物身上留下記號:2 回合內所有人打牠傷害 +25%。", cost: 20, cooldown: 2, target: "enemy", range: [1, 5], shape: "single", effect: "damage", scale: "phys", power: 0.5, statuses: [{ id: "mark", turns: 2 }] },
  { id: "pin", name: "釘足箭", icon: "📌", desc: "射穿腳掌:目標下一回合不能移動。", cost: 25, cooldown: 2, target: "enemy", range: [1, 4], shape: "single", effect: "damage", scale: "phys", power: 0.9, statuses: [{ id: "root", turns: 1 }] },
  // ── Vukid 卡西 ──
  { id: "vine", name: "藤鞭", icon: "🌿", desc: "甩出藤蔓抽打 1~2 格內的敵人。", cost: 0, cooldown: 0, target: "enemy", range: [1, 2], shape: "single", effect: "damage", scale: "magic", power: 0.85 },
  { id: "entangle", name: "藤縛", icon: "🪢", desc: "藤蔓從地底竄出纏住 3 格內的敵人,2 回合不能移動。", cost: 8, cooldown: 2, target: "enemy", range: [1, 3], shape: "single", effect: "damage", scale: "magic", power: 0.6, statuses: [{ id: "root", turns: 2 }] },
  { id: "bearform", name: "化熊", icon: "🐻", desc: "化身為熊 3 回合:造成傷害 +30%、承受傷害 −30%。", cost: 10, cooldown: 4, target: "self", range: [0, 0], shape: "single", effect: "buff", scale: "phys", power: 0, selfStatuses: [{ id: "bear", turns: 3 }] },
  { id: "grove", name: "林癒", icon: "🌳", desc: "讓草木的氣息包圍 3 格內的一位同伴:立刻回復,之後 3 回合持續再生。", cost: 9, cooldown: 1, target: "ally", range: [0, 3], shape: "single", effect: "heal", scale: "heal", power: 0.8, statuses: [{ id: "regen", turns: 3 }] },
  // ── Hanitu 布蘭 ──
  { id: "touch", name: "靈觸", icon: "🌙", desc: "以月光般的靈力觸碰 1~2 格內的敵人。", cost: 0, cooldown: 0, target: "enemy", range: [1, 2], shape: "single", effect: "damage", scale: "magic", power: 0.85 },
  { id: "spiritdeer", name: "靈鹿", icon: "🦌", desc: "請山林的靈鹿現身在 1~2 格內的空地,助戰 3 回合(回合結束時自己行動)。", cost: 12, cooldown: 4, target: "empty", range: [1, 2], shape: "single", effect: "summon", scale: "magic", power: 0, summon: "spirit-deer" },
  { id: "requiem", name: "安魂", icon: "🕊️", desc: "安撫 3 格內一位同伴:解除暈眩、遲緩、定身與標記,並回復生命。", cost: 8, cooldown: 1, target: "ally", range: [0, 3], shape: "single", effect: "cleanse", scale: "heal", power: 1 },
  { id: "soulbind", name: "靈縛", icon: "🔗", desc: "抽取 3 格內敵人的生命之氣,把一半的傷害轉成自己的生命。", cost: 10, cooldown: 2, target: "enemy", range: [1, 3], shape: "single", effect: "drain", scale: "magic", power: 1.2 },
  { id: "gore", name: "鹿角頂", icon: "🦌", desc: "用發光的鹿角頂撞相鄰的敵人。", cost: 0, cooldown: 0, target: "enemy", range: [1, 1], shape: "single", effect: "damage", scale: "phys", power: 1.1 },
  // ── 野獸與寒祟 ──
  { id: "bite", name: "撕咬", icon: "🦷", desc: "撲上來咬。鬣狗包圍同一個目標時更兇狠。", cost: 0, cooldown: 0, target: "enemy", range: [1, 1], shape: "single", effect: "damage", scale: "phys", power: 1 },
  { id: "howl", name: "號令", icon: "🐺", desc: "首領長嚎:所有鬣狗傷害 +30%,持續 2 回合。", cost: 0, cooldown: 4, target: "self", range: [0, 0], shape: "ring", size: 99, effect: "buff", scale: "phys", power: 0, statuses: [{ id: "might", turns: 2 }] },
  { id: "pounce", name: "撲殺", icon: "🐯", desc: "從 2~3 格外一躍而上,重擊目標並擊退。", cost: 0, cooldown: 2, target: "enemy", range: [2, 3], shape: "dash", effect: "damage", scale: "phys", power: 1.35, knockback: 1 },
  { id: "chill", name: "寒氣", icon: "🥶", desc: "吐出寒氣,1~2 格內的目標行動遲緩。", cost: 0, cooldown: 0, target: "enemy", range: [1, 2], shape: "single", effect: "damage", scale: "magic", power: 1, statuses: [{ id: "slow", turns: 1 }] },
  { id: "tusk", name: "象牙掃", icon: "🐘", desc: "揮動巨大的象牙,掃過前方三格。", cost: 0, cooldown: 0, target: "enemy", range: [1, 1], shape: "cleave", effect: "damage", scale: "phys", power: 1 },
  { id: "stomp", name: "踐踏", icon: "💢", desc: "重重踏地,身邊所有人暈眩一回合。", cost: 0, cooldown: 3, target: "self", range: [0, 0], shape: "ring", effect: "damage", scale: "phys", power: 1, statuses: [{ id: "stun", turns: 1 }] },
  { id: "frostbreath", name: "寒霜吐息", icon: "🌬️", desc: "朝一個方向吐出冰霜,直線 4 格。", cost: 0, cooldown: 2, target: "enemy", range: [1, 4], shape: "line", size: 4, effect: "damage", scale: "magic", power: 1.1, statuses: [{ id: "slow", turns: 1 }] },
  { id: "spawn", name: "寒祟湧出", icon: "🫧", desc: "身上的黑色觸手脫落,化成兩隻寒祟。", cost: 0, cooldown: 3, target: "self", range: [0, 0], shape: "ring", effect: "summon", scale: "magic", power: 0, summon: "wisp" },
];

const byId = new Map(SKILLS.map((s) => [s.id, s]));
export function getSkill(id: string): SkillDef {
  const s = byId.get(id);
  if (!s) throw new Error(`Unknown skill: ${id}`);
  return s;
}

/** from→to 是否在六個正方向的直線上;是的話回傳方向 */
export function lineDirection(from: Hex, to: Hex): Hex | null {
  const d = hexDistance(from, to);
  if (d === 0) return null;
  for (const dir of HEX_DIRECTIONS) {
    if (hexEq({ q: from.q + dir.q * d, r: from.r + dir.r * d }, to)) return dir;
  }
  return null;
}

/**
 * 技能影響的格子(不含 chain,chain 要看敵人位置,在 battle.ts 處理)。
 * caster = 施放時站的位置;target = 點選的格子。
 */
export function skillArea(skill: SkillDef, caster: Hex, target: Hex): Hex[] {
  switch (skill.shape) {
    case "single":
    case "dash":
    case "chain":
      return [target];
    case "blast": {
      const r = skill.size ?? 1;
      const out: Hex[] = [];
      for (let dq = -r; dq <= r; dq++)
        for (let dr = Math.max(-r, -dq - r); dr <= Math.min(r, -dq + r); dr++) out.push({ q: target.q + dq, r: target.r + dr });
      return out;
    }
    case "ring": {
      const r = skill.size ?? 1;
      if (r === 1) return hexNeighbors(caster);
      return skillArea({ ...skill, shape: "blast", size: r }, caster, caster).filter((h) => !hexEq(h, caster));
    }
    case "cleave": {
      // 目標格 + 同時與施放者、目標相鄰的兩格
      const around = new Set(hexNeighbors(caster).map(hexKey));
      return [target, ...hexNeighbors(target).filter((h) => around.has(hexKey(h)))];
    }
    case "line": {
      const dir = lineDirection(caster, target);
      if (!dir) return [];
      const out: Hex[] = [];
      for (let i = 1; i <= (skill.size ?? 3); i++) out.push(hexAdd(caster, { q: dir.q * i, r: dir.r * i }));
      return out;
    }
  }
}
