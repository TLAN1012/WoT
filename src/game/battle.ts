/**
 * 戰鬥引擎(純函式)。
 *
 *  回合:我方階段 → 敵方階段 → 回合數 +1。
 *  每位英雄每回合可「移動一次」+「行動一次」(技能/普攻/待命);行動後不能再移動。
 *  控制區:走進敵人相鄰的格子就得停下。友軍可以穿過、不能停在同一格。
 *
 *  狀態持續:減益(暈眩、遲緩)在「自己的回合結束時」−1;增益(強化、守勢、挑釁、再生)在「自己的回合開始時」−1。
 *  → 施加在敵人身上的 1 回合遲緩,剛好影響牠的下一個回合;巴度的 2 回合守勢會撐過兩次敵方階段。
 */
import { HEX_DIRECTIONS, hexAdd, hexDistance, hexEq, hexKey, hexNeighbors, type Hex } from "../engine/hex";
import { getClass, getFamily } from "./classes";
import { getDifficulty } from "./difficulty";
import { getEnemy } from "./enemies";
import { getHero } from "./heroes";
import { cellToHex, parseMap } from "./maps";
import { deriveStats, heroSkills } from "./progress";
import { getSkill, lineDirection, skillArea } from "./skills";
import { getTerrain } from "./terrain";
import type { BattleDef, BattleState, HeroProgress, LogEntry, Placement, SaveState, Side, SkillDef, Status, StatusId, Unit } from "./types";

const DEBUFFS: StatusId[] = ["stun", "slow"];
export const RAGE_ON_HIT = 15;
export const RAGE_ON_HURT = 10;
export const MAX_WISPS = 5;

// ── 建立 ──────────────────────────────────────────────
export function heroUnit(p: HeroProgress, pos: Hex): Unit {
  const h = getHero(p.id);
  const st = deriveStats(p);
  const fam = getFamily(getClass(h.classId).family);
  return {
    id: h.id,
    side: "hero",
    defId: h.id,
    name: h.name,
    isHero: true,
    pos,
    level: p.level,
    maxHp: st.maxHp,
    hp: st.maxHp,
    resource: fam.resource,
    maxRes: st.maxRes,
    res: fam.resource === "rage" ? 20 : st.maxRes,
    resRegen: st.resRegen,
    atk: st.atk,
    mag: st.mag,
    heal: st.heal,
    def: st.def,
    mdef: st.mdef,
    crit: st.crit,
    move: st.move,
    skills: heroSkills(p),
    cooldowns: {},
    statuses: [],
    moved: false,
    acted: false,
    xpValue: 0,
  };
}

export function enemyUnit(pl: Placement, difficulty: BattleState["difficulty"], side: Side = "enemy"): Unit {
  const e = getEnemy(pl.defId);
  const d = getDifficulty(difficulty);
  const hp = side === "enemy" ? Math.round(e.hp * d.enemyHp) : e.hp;
  return {
    id: pl.id,
    side,
    defId: e.id,
    name: e.name,
    isHero: false,
    pos: cellToHex(pl.cell),
    level: pl.level ?? 1,
    maxHp: hp,
    hp,
    resource: null,
    maxRes: 0,
    res: 0,
    resRegen: 0,
    atk: e.atk,
    mag: e.mag,
    heal: 0,
    def: e.def,
    mdef: e.mdef,
    crit: e.boss ? 0.05 : 0.08,
    move: e.move,
    skills: e.skills,
    cooldowns: {},
    statuses: [],
    moved: false,
    acted: false,
    xpValue: e.xp,
  };
}

export function initBattle(def: BattleDef, save: SaveState, seed = Date.now() % 100000): BattleState {
  const terrain = parseMap(def.map);
  const heroes = def.heroes
    .filter((h) => save.party.includes(h.heroId))
    .map((h) => heroUnit(save.heroes[h.heroId], cellToHex(h.cell)));
  const enemies = def.enemies.map((e) => enemyUnit(e, save.difficulty));
  const state: BattleState = {
    battleId: def.id,
    turn: 1,
    side: "hero",
    units: [...heroes, ...enemies],
    terrain,
    objective: def.objective,
    waves: def.waves ?? [],
    log: [{ turn: 1, kind: "info", text: "第 1 回合・我方行動" }],
    outcome: "ongoing",
    seed,
    difficulty: save.difficulty,
    xp: Object.fromEntries(heroes.map((h) => [h.id, 0])),
    nextId: 1,
  };
  return state;
}

// ── 查詢 ──────────────────────────────────────────────
export function living(s: BattleState, side?: Side): Unit[] {
  return s.units.filter((u) => !u.down && (!side || u.side === side));
}

export function unitAt(s: BattleState, h: Hex): Unit | undefined {
  return s.units.find((u) => !u.down && hexEq(u.pos, h));
}

export function getUnit(s: BattleState, id: string): Unit | undefined {
  return s.units.find((u) => u.id === id);
}

export function hasStatus(u: Unit, id: StatusId): boolean {
  return u.statuses.some((st) => st.id === id && st.turns > 0);
}

function isFrost(u: Unit): boolean {
  return !u.isHero && getEnemy(u.defId).frost === true;
}

export function canEnter(s: BattleState, u: Unit, h: Hex): boolean {
  const tid = s.terrain[hexKey(h)];
  if (!tid) return false;
  const t = getTerrain(tid);
  if (t.impassable) return false;
  if (t.warding && isFrost(u)) return false;
  return true;
}

export function moveAllowance(u: Unit): number {
  if (!u.isHero && getEnemy(u.defId).immobile) return 0;
  return Math.max(1, u.move - (hasStatus(u, "slow") ? 2 : 0));
}

export interface ReachInfo {
  pos: Hex;
  cost: number;
  from: string | null;
  /** 友軍佔的格子能穿過、不能停 */
  canStop: boolean;
}

/** Dijkstra:可移動到的格子(含原地與可穿過的友軍格)。敵人的控制區會讓移動停下。 */
export function reachable(s: BattleState, u: Unit): Map<string, ReachInfo> {
  const out = new Map<string, ReachInfo>();
  const start = hexKey(u.pos);
  out.set(start, { pos: u.pos, cost: 0, from: null, canStop: true });
  if (u.moved || u.acted || hasStatus(u, "stun")) return out;
  const budget = moveAllowance(u);
  const zoc = new Set<string>();
  for (const f of living(s).filter((o) => o.side !== u.side)) for (const n of hexNeighbors(f.pos)) zoc.add(hexKey(n));
  const occupied = new Map(living(s).map((o) => [hexKey(o.pos), o]));
  const frontier: Array<{ h: Hex; cost: number }> = [{ h: u.pos, cost: 0 }];
  while (frontier.length) {
    frontier.sort((a, b) => a.cost - b.cost);
    const cur = frontier.shift()!;
    const ck = hexKey(cur.h);
    if (cur.cost > out.get(ck)!.cost) continue;
    // 進入控制區就停(起點除外)
    if (ck !== start && zoc.has(ck)) continue;
    for (const n of hexNeighbors(cur.h)) {
      const nk = hexKey(n);
      if (!canEnter(s, u, n)) continue;
      const occ = occupied.get(nk);
      if (occ && occ.side !== u.side) continue;
      const cost = cur.cost + getTerrain(s.terrain[nk]).moveCost;
      if (cost > budget) continue;
      const prev = out.get(nk);
      if (prev && prev.cost <= cost) continue;
      out.set(nk, { pos: n, cost, from: ck, canStop: !occ });
      frontier.push({ h: n, cost });
    }
  }
  return out;
}

/** 從 reachable 結果回溯路徑(給移動動畫用) */
export function tracePath(reach: Map<string, ReachInfo>, to: Hex): Hex[] {
  const path: Hex[] = [];
  let k: string | null = hexKey(to);
  let guard = 0;
  while (k && guard++ < 64) {
    const info = reach.get(k);
    if (!info) break;
    path.unshift(info.pos);
    k = info.from;
  }
  return path;
}

export function skillRange(s: BattleState, u: Unit, skill: SkillDef, from: Hex = u.pos): [number, number] {
  const [min, max] = skill.range;
  const high = getTerrain(s.terrain[hexKey(from)]).highGround && max >= 2 && skill.shape !== "dash";
  return [min, max + (high ? 1 : 0)];
}

export function skillReady(u: Unit, skill: SkillDef): boolean {
  if ((u.cooldowns[skill.id] ?? 0) > 0) return false;
  if (u.resource && u.res < skill.cost) return false;
  if (skill.summon === "wisp") return true;
  return true;
}

/** dash:直線上、中間無阻擋;回傳衝到的落點(目標前一格) */
export function dashLanding(s: BattleState, u: Unit, from: Hex, target: Hex): Hex | null {
  const dir = lineDirection(from, target);
  if (!dir) return null;
  const d = hexDistance(from, target);
  let cur = from;
  for (let i = 1; i < d; i++) {
    cur = hexAdd(from, { q: dir.q * i, r: dir.r * i });
    if (!canEnter(s, u, cur) || unitAt(s, cur)) return null;
  }
  return d === 1 ? from : cur;
}

/** 某技能從 from 施放時,可以點選的目標格 */
export function skillTargets(s: BattleState, u: Unit, skillId: string, from: Hex = u.pos): Hex[] {
  const skill = getSkill(skillId);
  const [min, max] = skillRange(s, u, skill, from);
  const inRange = (h: Hex) => {
    const d = hexDistance(from, h);
    return d >= min && d <= max;
  };
  const taunter = tauntSource(s, u);
  switch (skill.target) {
    case "self":
      return [from];
    case "ally":
      return living(s, u.side)
        .filter((a) => inRange(a.pos) || (min === 0 && a.id === u.id))
        .map((a) => (a.id === u.id ? from : a.pos));
    case "empty": {
      const out: Hex[] = [];
      for (const k of Object.keys(s.terrain)) {
        const [q, r] = k.split(",").map(Number);
        const h = { q, r };
        if (inRange(h) && canEnter(s, u, h) && !unitAt(s, h) && !hexEq(h, from)) out.push(h);
      }
      return out;
    }
    case "enemy": {
      let foes = living(s).filter((o) => o.side !== u.side && inRange(o.pos));
      if (skill.shape === "line") foes = foes.filter((o) => lineDirection(from, o.pos) !== null);
      if (skill.shape === "dash") foes = foes.filter((o) => dashLanding(s, u, from, o.pos) !== null);
      // 被挑釁:能打到挑釁者就只能打牠
      if (taunter && foes.some((f) => f.id === taunter.id)) foes = foes.filter((f) => f.id === taunter.id);
      return foes.map((o) => o.pos);
    }
  }
}

export function tauntSource(s: BattleState, u: Unit): Unit | undefined {
  const st = u.statuses.find((x) => x.id === "taunt" && x.turns > 0 && x.source);
  if (!st) return undefined;
  const src = getUnit(s, st.source!);
  return src && !src.down ? src : undefined;
}

// ── 傷害與治療 ────────────────────────────────────────
export interface HitPreview {
  unitId: string;
  amount: number;
  kind: "damage" | "heal";
  lethal: boolean;
}

function damageMultiplier(s: BattleState, attacker: Unit, target: Unit): number {
  let mult = 1;
  if (attacker.isHero && getClass(getHero(attacker.defId).classId).family === "kapah") {
    mult += 0.4 * (1 - attacker.hp / attacker.maxHp);
  }
  if (hasStatus(attacker, "might")) mult += 0.3;
  if (!attacker.isHero && attacker.side === "enemy" && getEnemy(attacker.defId).pack) {
    const pals = living(s, attacker.side).filter(
      (p) => p.id !== attacker.id && !p.isHero && getEnemy(p.defId).pack && hexDistance(p.pos, target.pos) === 1,
    ).length;
    mult += Math.min(0.4, pals * 0.2);
  }
  if (attacker.side === "enemy") mult *= getDifficulty(s.difficulty).enemyDmg;
  // 承傷方
  mult *= 1 - getTerrain(s.terrain[hexKey(target.pos)]).defense;
  if (hasStatus(target, "guard")) mult *= 0.7;
  const allies = living(s, target.side).filter((a) => a.id !== target.id && hexDistance(a.pos, target.pos) === 1);
  if (allies.some((a) => a.defId === "totem")) mult *= 0.8;
  if (target.isHero && allies.some((a) => a.isHero && getClass(getHero(a.defId).classId).family === "inibs")) mult *= 0.9;
  return mult;
}

export function computeDamage(s: BattleState, attacker: Unit, target: Unit, skill: SkillDef, hop = 0): number {
  const base = skill.scale === "phys" ? attacker.atk : attacker.mag;
  const raw = base * skill.power * Math.pow(0.75, hop);
  const def = skill.scale === "phys" ? target.def : target.mdef;
  return Math.max(1, Math.round(raw * (30 / (30 + def)) * damageMultiplier(s, attacker, target)));
}

export function computeHeal(attacker: Unit, skill: SkillDef): number {
  const fam = attacker.isHero ? getClass(getHero(attacker.defId).classId).family : null;
  return Math.round(attacker.heal * skill.power * (fam === "inibs" ? 1.2 : 1));
}

function chainTargets(s: BattleState, u: Unit, first: Unit, jumps: number): Unit[] {
  const hit: Unit[] = [first];
  while (hit.length < jumps) {
    const last = hit[hit.length - 1];
    const next = living(s)
      .filter((o) => o.side !== u.side && !hit.includes(o) && hexDistance(o.pos, last.pos) <= 2)
      .sort((a, b) => hexDistance(a.pos, last.pos) - hexDistance(b.pos, last.pos))[0];
    if (!next) break;
    hit.push(next);
  }
  return hit;
}

/** 技能會打到誰(預覽與結算共用) */
export function skillVictims(s: BattleState, u: Unit, skillId: string, target: Hex, from: Hex = u.pos): Unit[] {
  const skill = getSkill(skillId);
  if (skill.effect === "summon") return [];
  if (skill.effect === "heal") {
    const a = hexEq(target, from) ? u : unitAt(s, target);
    return a ? [a] : [];
  }
  if (skill.effect === "buff") {
    if (skill.id === "howl") return living(s, u.side).filter((a) => !a.isHero && getEnemy(a.defId).pack);
    return living(s).filter((o) => o.side !== u.side && hexDistance(o.pos, from) <= (skill.size ?? 1));
  }
  if (skill.shape === "chain") {
    const first = unitAt(s, target);
    return first ? chainTargets(s, u, first, skill.size ?? 3) : [];
  }
  const area = new Set(skillArea(skill, from, target).map(hexKey));
  return living(s).filter((o) => o.side !== u.side && area.has(hexKey(o.pos)));
}

export function previewSkill(s: BattleState, u: Unit, skillId: string, target: Hex, from: Hex = u.pos): HitPreview[] {
  const skill = getSkill(skillId);
  const victims = skillVictims(s, u, skillId, target, from);
  if (skill.effect === "heal")
    return victims.map((v) => ({ unitId: v.id, amount: Math.min(v.maxHp - v.hp, computeHeal(u, skill)), kind: "heal", lethal: false }));
  if (skill.effect !== "damage") return [];
  const moved = { ...u, pos: from };
  return victims.map((v, i) => {
    const amount = computeDamage(s, moved, v, skill, skill.shape === "chain" ? i : 0);
    return { unitId: v.id, amount, kind: "damage", lethal: amount >= v.hp };
  });
}

// ── 亂數(可重播:同一個種子、同一步驟,結果相同) ──────
function roll(s: BattleState, salt: number): number {
  let a = (s.seed * 2654435761 + s.log.length * 40503 + salt * 97 + s.turn * 7919) >>> 0;
  a = Math.imul(a ^ (a >>> 15), a | 1);
  a ^= a + Math.imul(a ^ (a >>> 7), a | 61);
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
}

// ── 動作 ──────────────────────────────────────────────
export type BattleAction =
  | { type: "MOVE"; unitId: string; to: Hex }
  | { type: "SKILL"; unitId: string; skillId: string; target: Hex }
  | { type: "WAIT"; unitId: string }
  | { type: "END_TURN" };

function mapUnit(s: BattleState, id: string, f: (u: Unit) => Unit): BattleState {
  return { ...s, units: s.units.map((u) => (u.id === id ? f(u) : u)) };
}

function log(s: BattleState, e: Omit<LogEntry, "turn">): BattleState {
  return { ...s, log: [...s.log, { turn: s.turn, ...e }] };
}

function addStatus(u: Unit, st: Status): Unit {
  const others = u.statuses.filter((x) => x.id !== st.id);
  return { ...u, statuses: [...others, st] };
}

function addXp(s: BattleState, heroId: string, xp: number): BattleState {
  if (!(heroId in s.xp)) return s;
  return { ...s, xp: { ...s.xp, [heroId]: s.xp[heroId] + xp } };
}

function freeHexNear(s: BattleState, u: Unit, h: Hex): Hex | null {
  const seen = new Set<string>([hexKey(h)]);
  const queue = [h];
  while (queue.length) {
    const c = queue.shift()!;
    if (canEnter(s, u, c) && !unitAt(s, c)) return c;
    for (const n of hexNeighbors(c)) {
      const k = hexKey(n);
      if (!seen.has(k) && s.terrain[k]) {
        seen.add(k);
        queue.push(n);
      }
    }
  }
  return null;
}

function applyDamage(s: BattleState, attacker: Unit, targetId: string, amount: number, crit: boolean): BattleState {
  const t = getUnit(s, targetId)!;
  const hp = Math.max(0, t.hp - amount);
  s = mapUnit(s, targetId, (x) => ({
    ...x,
    hp,
    res: x.resource === "rage" ? Math.min(x.maxRes, x.res + RAGE_ON_HURT) : x.res,
  }));
  s = log(s, { kind: "hit", text: `${attacker.name} → ${t.name} ${amount}${crit ? "(暴擊!)" : ""}`, at: t.pos, amount, crit });
  if (hp <= 0) {
    const e = t.isHero ? null : getEnemy(t.defId);
    s = mapUnit(s, targetId, (x) => ({ ...x, down: true, statuses: [] }));
    const verb = t.isHero ? "倒下了" : e?.purify ? "身上的寒祟被淨化了" : t.side === "hero" ? "消散了" : "被擊退";
    s = log(s, { kind: "down", text: `${t.name}${verb}`, at: t.pos });
    if (attacker.isHero && !t.isHero) {
      // 擊倒經驗:出手的人拿一半,其他同伴平分另一半(不會只有法師升級)
      const others = living(s, "hero").filter((h) => h.isHero && h.id !== attacker.id);
      s = addXp(s, attacker.id, Math.round(t.xpValue * (others.length ? 0.5 : 1)));
      for (const o of others) s = addXp(s, o.id, Math.round((t.xpValue * 0.5) / others.length));
    }
  }
  return s;
}

function executeSkill(s: BattleState, u: Unit, skill: SkillDef, target: Hex): BattleState {
  let from = u.pos;
  // 付出代價、進入冷卻
  s = mapUnit(s, u.id, (x) => ({
    ...x,
    res: x.resource ? x.res - skill.cost : x.res,
    cooldowns: skill.cooldown ? { ...x.cooldowns, [skill.id]: skill.cooldown + 1 } : x.cooldowns,
  }));
  s = log(s, { kind: "skill", text: `${u.name}:${skill.icon} ${skill.name}`, at: target, skill: skill.id });

  if (skill.shape === "dash") {
    const land = dashLanding(s, u, from, target);
    if (land && !hexEq(land, from)) {
      s = mapUnit(s, u.id, (x) => ({ ...x, pos: land }));
      from = land;
    }
  }
  const caster = getUnit(s, u.id)!;

  if (skill.effect === "summon") {
    if (skill.summon === "totem") {
      const id = `totem-${s.nextId}`;
      const t = { ...enemyUnit({ id, defId: "totem", cell: [0, 0] }, s.difficulty, "hero"), pos: target, lifetime: 3, acted: true, moved: true };
      s = { ...s, nextId: s.nextId + 1, units: [...s.units, t] };
    } else if (skill.summon === "wisp") {
      const wisps = living(s, u.side).filter((w) => w.defId === "wisp").length;
      const n = Math.min(2, MAX_WISPS - wisps);
      for (let i = 0; i < n; i++) {
        const proto = enemyUnit({ id: `wisp-${s.nextId}`, defId: "wisp", cell: [0, 0] }, s.difficulty);
        const spot = freeHexNear(s, proto, hexNeighbors(caster.pos)[(s.turn + i * 3) % 6]);
        if (!spot) break;
        s = { ...s, nextId: s.nextId + 1, units: [...s.units, { ...proto, pos: spot, moved: true, acted: true }] };
      }
    }
    if (u.isHero) s = addXp(s, u.id, 8);
    return s;
  }

  const victims = skillVictims(s, caster, skill.id, target, from);

  if (skill.effect === "heal") {
    for (const v of victims) {
      const amount = Math.min(v.maxHp - v.hp, computeHeal(caster, skill));
      s = mapUnit(s, v.id, (x) => ({ ...x, hp: x.hp + amount }));
      s = log(s, { kind: "heal", text: `${caster.name} 治療 ${v.name} +${amount}`, at: v.pos, amount });
    }
    return addXp(s, u.id, 8);
  }

  if (skill.effect === "buff") {
    for (const v of victims) {
      for (const st of skill.statuses ?? []) s = mapUnit(s, v.id, (x) => addStatus(x, { ...st, source: skill.id === "roar" ? u.id : undefined }));
    }
    for (const st of skill.selfStatuses ?? []) s = mapUnit(s, u.id, (x) => addStatus(x, { ...st }));
    return u.isHero ? addXp(s, u.id, 8) : s;
  }

  // 傷害
  let dealt = false;
  victims.forEach((v, i) => {
    const cur = getUnit(s, v.id);
    if (!cur || cur.down) return;
    const atk = getUnit(s, u.id)!;
    let amount = computeDamage(s, atk, cur, skill, skill.shape === "chain" ? i : 0);
    const critMul = atk.isHero && getClass(getHero(atk.defId).classId).family === "rikat" && skill.scale === "magic" ? 1.75 : 1.5;
    const crit = roll(s, i + 1) < atk.crit;
    if (crit) amount = Math.round(amount * critMul);
    s = applyDamage(s, atk, v.id, amount, crit);
    dealt = true;
    const after = getUnit(s, v.id)!;
    if (!after.down) {
      const sts = skill.shape === "chain" ? (i === 0 ? skill.statuses : undefined) : skill.statuses;
      for (const st of sts ?? []) s = mapUnit(s, v.id, (x) => addStatus(x, { ...st }));
      if (skill.knockback) {
        const dir = lineDirection(from, after.pos) ?? HEX_DIRECTIONS.find((d) => hexEq(hexAdd(from, d), after.pos));
        if (dir) {
          const dest = hexAdd(after.pos, dir);
          if (canEnter(s, after, dest) && !unitAt(s, dest)) s = mapUnit(s, v.id, (x) => ({ ...x, pos: dest }));
        }
      }
    }
  });
  if (dealt && u.isHero) {
    s = addXp(s, u.id, 8);
    s = mapUnit(s, u.id, (x) => (x.resource === "rage" ? { ...x, res: Math.min(x.maxRes, x.res + RAGE_ON_HIT) } : x));
  }
  return s;
}

export function battleReducer(s: BattleState, a: BattleAction): BattleState {
  if (s.outcome !== "ongoing") return s;
  switch (a.type) {
    case "MOVE": {
      const u = getUnit(s, a.unitId);
      if (!u || u.down || u.side !== s.side || u.moved || u.acted) return s;
      const dest = reachable(s, u).get(hexKey(a.to));
      if (!dest?.canStop) return s;
      return mapUnit(s, u.id, (x) => ({ ...x, pos: a.to, moved: true }));
    }
    case "SKILL": {
      const u = getUnit(s, a.unitId);
      if (!u || u.down || u.side !== s.side || u.acted || !u.skills.includes(a.skillId)) return s;
      const skill = getSkill(a.skillId);
      if (!skillReady(u, skill)) return s;
      if (!skillTargets(s, u, a.skillId).some((h) => hexEq(h, a.target))) return s;
      let next = executeSkill(s, u, skill, a.target);
      next = mapUnit(next, u.id, (x) => ({ ...x, acted: true, moved: true }));
      return checkOutcome(next);
    }
    case "WAIT": {
      const u = getUnit(s, a.unitId);
      if (!u || u.side !== s.side) return s;
      return mapUnit(s, u.id, (x) => ({ ...x, acted: true, moved: true }));
    }
    case "END_TURN":
      return endSide(s);
  }
}

// ── 回合流程 ──────────────────────────────────────────
function endSide(s: BattleState): BattleState {
  // 本方減益 −1
  s = {
    ...s,
    units: s.units.map((u) =>
      u.side === s.side
        ? { ...u, statuses: u.statuses.map((st) => (DEBUFFS.includes(st.id) ? { ...st, turns: st.turns - 1 } : st)).filter((st) => st.turns > 0) }
        : u,
    ),
  };
  const nextSide: Side = s.side === "hero" ? "enemy" : "hero";
  const turn = nextSide === "hero" ? s.turn + 1 : s.turn;
  s = { ...s, side: nextSide, turn };
  if (nextSide === "hero") {
    s = spawnWaves(s);
    s = log(s, { kind: "info", text: `第 ${turn} 回合・我方行動` });
  } else {
    s = log(s, { kind: "info", text: "敵方行動" });
  }
  s = beginSide(s);
  return checkOutcome(s);
}

function beginSide(s: BattleState): BattleState {
  const side = s.side;
  let out = s;
  for (const u0 of living(s, side)) {
    let u = getUnit(out, u0.id)!;
    // 召喚物壽命
    if (u.lifetime !== undefined) {
      const left = u.lifetime - 1;
      if (left <= 0) {
        out = mapUnit(out, u.id, (x) => ({ ...x, down: true }));
        out = log(out, { kind: "info", text: `${u.name}消散了`, at: u.pos });
        continue;
      }
      u = { ...u, lifetime: left };
    }
    const stunned = hasStatus(u, "stun");
    const statuses = u.statuses
      .map((st) => (DEBUFFS.includes(st.id) ? st : { ...st, turns: st.turns - 1 }))
      .filter((st) => st.turns > 0);
    const cooldowns = Object.fromEntries(Object.entries(u.cooldowns).map(([k, v]) => [k, Math.max(0, v - 1)]));
    let hp = u.hp;
    const t = getTerrain(out.terrain[hexKey(u.pos)]);
    let healed = 0;
    if (t.heal) healed += Math.round(u.maxHp * t.heal);
    const regen = u.statuses.find((st) => st.id === "regen");
    if (regen) healed += regen.value ?? 0;
    // 圖騰光環
    for (const tot of living(out, side).filter((x) => x.defId === "totem" && hexDistance(x.pos, u.pos) === 1)) {
      healed += getEnemy(tot.defId).aura?.heal ?? 0;
    }
    healed = Math.min(u.maxHp - hp, healed);
    hp += healed;
    u = {
      ...u,
      hp,
      statuses,
      cooldowns,
      res: u.resource === "mana" ? Math.min(u.maxRes, u.res + u.resRegen) : u.res,
      moved: stunned,
      acted: stunned,
    };
    out = mapUnit(out, u.id, () => u);
    if (healed > 0 && u.defId !== "totem") out = log(out, { kind: "heal", text: `${u.name} 回復 +${healed}`, at: u.pos, amount: healed });
    if (stunned) out = log(out, { kind: "info", text: `${u.name}暈眩中,這回合無法行動`, at: u.pos });
  }
  return out;
}

function spawnWaves(s: BattleState): BattleState {
  const due = s.waves.filter((w) => w.turn === s.turn);
  for (const w of due) {
    s = log(s, { kind: "event", text: w.text });
    for (const pl of w.units) {
      const proto = enemyUnit(pl, s.difficulty);
      const spot = freeHexNear(s, proto, proto.pos);
      if (spot) s = { ...s, units: [...s.units, { ...proto, pos: spot }] };
    }
  }
  return s;
}

export function checkOutcome(s: BattleState): BattleState {
  if (s.outcome !== "ongoing") return s;
  const heroes = living(s, "hero").filter((u) => u.isHero);
  if (!heroes.length) return log({ ...s, outcome: "defeat" }, { kind: "info", text: "敗北:三人都倒下了" });
  const o = s.objective;
  const foes = living(s, "enemy");
  const pending = s.waves.some((w) => w.turn > s.turn);
  if (o.kind === "rout" && !foes.length && !pending) return log({ ...s, outcome: "victory" }, { kind: "info", text: "勝利!" });
  if (o.kind === "purify" && getUnit(s, o.unitId)?.down) return log({ ...s, outcome: "victory" }, { kind: "info", text: "勝利!" });
  if (o.kind === "survive") {
    if (o.orBoss && getUnit(s, o.orBoss)?.down) return log({ ...s, outcome: "victory" }, { kind: "info", text: "勝利!首領被擊退了" });
    if (s.turn > o.turns) return log({ ...s, outcome: "victory" }, { kind: "info", text: "勝利!天亮了" });
    if (!foes.length && !pending) return log({ ...s, outcome: "victory" }, { kind: "info", text: "勝利!" });
  }
  return s;
}

/** 我方還有沒有能動的人 */
export function sideDone(s: BattleState): boolean {
  return living(s, s.side).every((u) => u.acted || u.lifetime !== undefined || (!u.isHero && getEnemy(u.defId).immobile));
}

// ── 結算 ──────────────────────────────────────────────
export interface BattleResult {
  victory: boolean;
  stars: number;
  turns: number;
  fallen: string[];
  xp: Record<string, number>;
}

export const VICTORY_XP = 40;

export function battleResult(s: BattleState, parTurns: number): BattleResult {
  const heroes = s.units.filter((u) => u.isHero);
  const fallen = heroes.filter((u) => u.down).map((u) => u.id);
  const victory = s.outcome === "victory";
  const stars = victory ? 1 + (fallen.length === 0 ? 1 : 0) + (s.turn <= parTurns ? 1 : 0) : 0;
  const xp: Record<string, number> = {};
  for (const h of heroes) {
    const base = s.xp[h.id] ?? 0;
    // 敗北仍保留一半經驗(撤退重來不會白打)
    xp[h.id] = victory ? base + VICTORY_XP : Math.floor(base / 2);
  }
  return { victory, stars, turns: s.turn, fallen, xp };
}
