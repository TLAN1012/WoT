/**
 * 野獸 AI — 效用評分。
 *
 * 每隻野獸輪到時:列出所有「移動到某格 × 用某技能 × 打某目標」的組合打分,
 * 取最高分(難度越低越容易挑到次佳解)。打不到人就沿著地形距離場逼近最近的英雄。
 *
 *  - 會集火快倒下的、會挑防禦薄的(法師)、會利用包圍加成(鬣狗)
 *  - 被戰吼挑釁時,能打到巴度就只打巴度
 *  - 首領在群體多時長嚎;古象神優先用踐踏/吐息打多人,寒祟不多時召喚
 *  - 回傳一個「計畫」,由 UI 分兩步(移動、出手)播放
 */
import { hexDistance, hexEq, hexKey, hexNeighbors, type Hex } from "../engine/hex";
import {
  canEnter,
  unitAt,
  getUnit,
  living,
  MAX_WISPS,
  previewSkill,
  reachable,
  skillReady,
  skillTargets,
  skillVictims,

  type BattleAction,
} from "./battle";
import { getDifficulty } from "./difficulty";
import { getEnemy } from "./enemies";
import { getSkill } from "./skills";
import { getTerrain } from "./terrain";
import type { BattleState, Unit } from "./types";

export interface AiPlan {
  unitId: string;
  move?: Hex;
  skill?: { id: string; target: Hex };
}

/** 從所有英雄出發的地形距離場(忽略單位,只看地形與寒祟禁區) */
function distanceField(s: BattleState, u: Unit): Map<string, number> {
  const dist = new Map<string, number>();
  const frontier: Array<{ h: Hex; d: number }> = [];
  for (const h of living(s).filter((x) => x.side !== u.side && x.defId !== "totem")) {
    dist.set(hexKey(h.pos), 0);
    frontier.push({ h: h.pos, d: 0 });
  }
  while (frontier.length) {
    frontier.sort((a, b) => a.d - b.d);
    const cur = frontier.shift()!;
    if (cur.d > (dist.get(hexKey(cur.h)) ?? Infinity)) continue;
    for (const n of hexNeighbors(cur.h)) {
      const k = hexKey(n);
      if (!canEnter(s, u, n)) continue;
      const d = cur.d + getTerrain(s.terrain[k]).moveCost;
      if (d < (dist.get(k) ?? Infinity)) {
        dist.set(k, d);
        frontier.push({ h: n, d });
      }
    }
  }
  return dist;
}

function rand(s: BattleState, u: Unit): number {
  let h = s.seed ^ (s.turn * 374761393);
  for (const c of u.id) h = Math.imul(h ^ c.charCodeAt(0), 668265263);
  h ^= s.log.length * 2246822519;
  return ((h ^ (h >>> 13)) >>> 0) / 4294967296;
}

interface Option {
  move: Hex;
  skillId: string;
  target: Hex;
  score: number;
}

function scoreOption(s: BattleState, u: Unit, from: Hex, skillId: string, target: Hex): number {
  const skill = getSkill(skillId);
  if (skill.effect === "summon") {
    if (skill.summon === "wisp") {
      const wisps = living(s, u.side).filter((w) => w.defId === "wisp").length;
      return wisps >= MAX_WISPS - 1 ? -1 : 22 - wisps * 5;
    }
    // 圖騰:放在受傷同伴旁邊才划算
    const near = living(s, u.side).filter((a) => a.isHero && hexDistance(a.pos, target) === 1);
    const hurt = near.filter((a) => a.hp < a.maxHp * 0.8).length;
    return near.length >= 2 && hurt >= 1 ? 10 + near.length * 6 : -1;
  }
  if (skill.effect === "heal") {
    const v = unitAt(s, target) ?? u;
    const miss = v.maxHp - v.hp;
    if (miss < v.maxHp * 0.3) return -1;
    return Math.min(miss, previewSkill(s, u, skillId, target, from)[0]?.amount ?? 0) * 1.3 + (v.hp < v.maxHp * 0.4 ? 25 : 0);
  }
  if (skill.effect === "buff" && u.isHero) {
    // 戰吼:身邊敵人多、同伴危險時
    const foes = skillVictims(s, u, skillId, target, from).length;
    return foes >= 2 ? 10 + foes * 6 : -1;
  }
  if (skill.effect === "buff") {
    const pack = skillVictims(s, u, skillId, target, from).filter((p) => !p.statuses.some((x) => x.id === "might"));
    return pack.length >= 2 ? 12 * pack.length : -1;
  }
  const hits = previewSkill(s, u, skillId, target, from);
  let score = 0;
  for (const h of hits) {
    const v = getUnit(s, h.unitId)!;
    const w = v.isHero || u.isHero ? 1 : 0.4; // 圖騰也會打,但比較不在乎
    score += h.amount * w;
    if (h.lethal) score += v.isHero || u.isHero ? 40 : 12;
    // 挑軟柿子:防禦低、血量比例低
    if (v.isHero) score += (1 - v.hp / v.maxHp) * 10 + Math.max(0, 10 - v.def);
    else if (getEnemy(v.defId).boss) score += 6;
  }
  if (!hits.length) return -1;
  // 狀態效果的價值
  if (skill.statuses?.some((x) => x.id === "stun")) score += 8 * hits.length;
  if (skill.statuses?.some((x) => x.id === "slow")) score += 3 * hits.length;
  return score;
}

export function planEnemy(s: BattleState, u: Unit): AiPlan {
  const reach = reachable(s, u);
  const options: Option[] = [];
  const e = u.isHero ? null : getEnemy(u.defId);
  for (const [, info] of reach) {
    if (!info.canStop) continue;
    const from = info.pos;
    const moved = { ...u, pos: from };
    // 以「假裝已經站到那格」的狀態評估
    const sim: BattleState = { ...s, units: s.units.map((x) => (x.id === u.id ? moved : x)) };
    for (const skillId of u.skills) {
      const skill = getSkill(skillId);
      if (!skillReady(u, skill)) continue;
      for (const target of skillTargets(sim, moved, skillId, from)) {
        const sc = scoreOption(sim, moved, from, skillId, target);
        if (sc <= 0) continue;
        // 站位:喜歡有掩護的地形、鬣狗喜歡跟同伴一起
        let pos = getTerrain(s.terrain[hexKey(from)]).defense * 10;
        if (e?.pack) pos += living(s, u.side).filter((p) => p.id !== u.id && hexDistance(p.pos, from) === 1).length * 2;
        // 英雄(模擬玩家):脆皮不要站到很多野獸搆得到的地方
        if (u.isHero && u.def < 10) pos -= living(s, "enemy").filter((f) => hexDistance(f.pos, from) <= f.move).length * 4;
        options.push({ move: from, skillId, target, score: sc + pos - info.cost * 0.1 });
      }
    }
  }
  if (options.length) {
    options.sort((a, b) => b.score - a.score);
    const skill = u.isHero ? 1 : getDifficulty(s.difficulty).aiSkill;
    const pick = rand(s, u) < skill ? options[0] : options[Math.min(options.length - 1, Math.floor(rand(s, u) * 3))];
    return { unitId: u.id, move: hexEq(pick.move, u.pos) ? undefined : pick.move, skill: { id: pick.skillId, target: pick.target } };
  }
  // 打不到人:逼近最近的敵人(英雄模擬則逼近最近的野獸)
  const dist = distanceField(s, u);
  let best: Hex | undefined;
  let bestD = dist.get(hexKey(u.pos)) ?? Infinity;
  for (const [k, info] of reach) {
    if (!info.canStop) continue;
    const d = dist.get(k) ?? Infinity;
    if (d < bestD) {
      bestD = d;
      best = info.pos;
    }
  }
  return { unitId: u.id, move: best };
}

/** 模擬玩家:下一位還沒行動的英雄(先治療者、再法師、最後坦) */
export function nextHero(s: BattleState): Unit | undefined {
  return living(s, "hero").filter((u) => u.isHero && !u.acted)[0];
}

/** 下一隻還沒行動的野獸(首領最後動,讓小弟先圍上去) */
export function nextEnemy(s: BattleState): Unit | undefined {
  return living(s, "enemy")
    .filter((u) => !u.acted && !getEnemy(u.defId).immobile)
    .sort((a, b) => Number(getEnemy(a.defId).boss ?? false) - Number(getEnemy(b.defId).boss ?? false))[0];
}

/** 把計畫轉成動作序列 */
export function planActions(p: AiPlan): BattleAction[] {
  const out: BattleAction[] = [];
  if (p.move) out.push({ type: "MOVE", unitId: p.unitId, to: p.move });
  if (p.skill) out.push({ type: "SKILL", unitId: p.unitId, skillId: p.skill.id, target: p.skill.target });
  else out.push({ type: "WAIT", unitId: p.unitId });
  return out;
}

/** 整個敵方階段一次跑完(測試與模擬用) */
export function runEnemyPhase(s: BattleState, reduce: (s: BattleState, a: BattleAction) => BattleState): BattleState {
  let guard = 0;
  while (s.side === "enemy" && s.outcome === "ongoing" && guard++ < 60) {
    const u = nextEnemy(s);
    if (!u) return reduce(s, { type: "END_TURN" });
    for (const a of planActions(planEnemy(s, u))) s = reduce(s, a);
    const after = getUnit(s, u.id);
    if (after && !after.down && !after.acted) s = reduce(s, { type: "WAIT", unitId: u.id });
  }
  return s;
}


/** 我方的召喚獸(靈鹿)在我方回合結束前自己行動 */
export function runAllySummons(s: BattleState, reduce: (s: BattleState, a: BattleAction) => BattleState): BattleState {
  for (const u of living(s, "hero").filter((x) => !x.isHero && x.skills.length && !getEnemy(x.defId).immobile)) {
    const fresh = getUnit(s, u.id);
    if (!fresh || fresh.down) continue;
    // 召喚當回合標記為已行動,這裡重新讓牠動
    s = { ...s, units: s.units.map((x) => (x.id === u.id ? { ...x, moved: false, acted: false } : x)) };
    for (const a of planActions(planEnemy(s, getUnit(s, u.id)!))) s = reduce(s, a);
  }
  return s;
}
