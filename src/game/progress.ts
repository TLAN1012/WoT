/**
 * 英雄成長與存檔。
 *  - 屬性 = 職業基礎 + 每級自動成長 ×(等級−1) + 玩家自己分配的點數
 *  - 每升一級得到 3 點自由點數(在「部族」畫面分配)
 *  - 存檔在 localStorage(wot-rpg-v1)
 */
import { getClass, getFamily, MAX_LEVEL, POINTS_PER_LEVEL, XP_PER_LEVEL } from "./classes";
import { getHero } from "./heroes";
import { getSkill } from "./skills";
import { getKeepsake } from "./keepsakes";
import { MAX_KEEPSAKE_LEVEL, slotBonus, UPGRADE_COST } from "./materials";
import type { AttrId, Attrs, CharmEffect, DifficultyId, HeroProgress, MaterialId, SaveState, SlotId } from "./types";

export const ATTR_IDS: AttrId[] = ["str", "agi", "int", "spi", "vit"];
const ZERO: Attrs = { str: 0, agi: 0, int: 0, spi: 0, vit: 0 };

export function heroAttrs(p: HeroProgress): Attrs {
  const cls = getClass(getHero(p.id).classId);
  const out = { ...cls.base };
  for (const a of ATTR_IDS) out[a] += (cls.growth[a] ?? 0) * (p.level - 1) + (p.bonus[a] ?? 0);
  return out;
}

export interface DerivedStats {
  maxHp: number;
  atk: number;
  mag: number;
  heal: number;
  def: number;
  mdef: number;
  crit: number;
  maxRes: number;
  resRegen: number;
  move: number;
}

/** 屬性 → 戰鬥數值(公式也寫在 docs/RULES.md) */
export function deriveStats(p: HeroProgress): DerivedStats {
  const a = heroAttrs(p);
  const cls = getClass(getHero(p.id).classId);
  const fam = getFamily(cls.family);
  const rage = fam.resource === "rage";
  return {
    maxHp: 20 + a.vit * 6,
    atk: a.str * 2 + (cls.family === "hanup" ? a.agi : 0),
    // 祭司的法術出自靈力
    mag: a.int * 2 + (cls.family === "inibs" || cls.family === "hanitu" ? a.spi : 0),
    heal: a.spi * 2,
    def: a.vit + cls.armor,
    mdef: a.spi + Math.floor(a.int / 2),
    crit: Math.min(0.4, a.agi * 0.015),
    maxRes: rage ? 100 : 10 + a.spi * 2 + a.int,
    resRegen: rage ? 0 : 2 + Math.floor(a.spi / 3),
    move: cls.move,
  };
}

/** 目前等級已習得的技能(含普攻) */
export function heroSkills(p: HeroProgress): string[] {
  const cls = getClass(getHero(p.id).classId);
  return [cls.basic, ...cls.skills.filter((s) => s.level <= p.level).map((s) => s.skill)];
}

/** 下一個要學的技能 */
export function nextSkill(p: HeroProgress): { level: number; name: string } | null {
  const cls = getClass(getHero(p.id).classId);
  const n = cls.skills.find((s) => s.level > p.level);
  return n ? { level: n.level, name: getSkill(n.skill).name } : null;
}

export function newHero(id: string): HeroProgress {
  return { id, level: 1, xp: 0, bonus: { ...ZERO }, unspent: 0 };
}

/** 加經驗並處理升級;回傳升了幾級 */
export function gainXp(p: HeroProgress, xp: number): { hero: HeroProgress; levels: number } {
  let { level, xp: cur, unspent } = p;
  cur += xp;
  let levels = 0;
  while (cur >= XP_PER_LEVEL && level < MAX_LEVEL) {
    cur -= XP_PER_LEVEL;
    level += 1;
    unspent += POINTS_PER_LEVEL;
    levels += 1;
  }
  if (level >= MAX_LEVEL) cur = 0;
  return { hero: { ...p, level, xp: cur, unspent }, levels };
}

export function spendPoint(p: HeroProgress, attr: AttrId): HeroProgress {
  if (p.unspent <= 0) return p;
  return { ...p, unspent: p.unspent - 1, bonus: { ...p.bonus, [attr]: p.bonus[attr] + 1 } };
}

/** 重新分配:退回所有自由點數 */
export function resetPoints(p: HeroProgress): HeroProgress {
  const spent = ATTR_IDS.reduce((n, a) => n + p.bonus[a], 0);
  return { ...p, bonus: { ...ZERO }, unspent: p.unspent + spent };
}

// ── 存檔 ──────────────────────────────────────────────
const KEY = "wot-rpg-v1";

export function newSave(difficulty: DifficultyId): SaveState {
  const party = ["batu", "danum", "bitu"];
  return {
    version: 1,
    generation: 1,
    difficulty,
    party,
    heroes: Object.fromEntries(party.map((id) => [id, newHero(id)])),
    stars: {},
    seenIntro: [],
    inventory: [],
    materials: {},
    shards: {},
    equipment: {},
    nextUid: 1,
  };
}

// ── 信物 ──────────────────────────────────────────────
export function grantKeepsake(s: SaveState, id: string): SaveState {
  return { ...s, inventory: [...s.inventory, { uid: `k${s.nextUid}`, id }], nextUid: s.nextUid + 1 };
}

/** 戴上(uid)或取下(null);同一件信物從別人/別的位置移過來 */
export function equip(s: SaveState, heroId: string, slot: SlotId, uid: string | null): SaveState {
  const equipment: SaveState["equipment"] = {};
  for (const [h, slots] of Object.entries(s.equipment)) {
    equipment[h] = Object.fromEntries(Object.entries(slots).filter(([, u]) => u !== uid));
  }
  equipment[heroId] = { ...(equipment[heroId] ?? {}) };
  if (uid) equipment[heroId][slot] = uid;
  else delete equipment[heroId][slot];
  return { ...s, equipment };
}

/** 誰戴著這件(沒人戴回傳 null) */
export function wearer(s: SaveState, uid: string): { heroId: string; slot: SlotId } | null {
  for (const [heroId, slots] of Object.entries(s.equipment))
    for (const [slot, u] of Object.entries(slots)) if (u === uid) return { heroId, slot: slot as SlotId };
  return null;
}

export function heroCharms(s: SaveState, heroId: string): CharmEffect[] {
  const slots = s.equipment?.[heroId] ?? {};
  const out: CharmEffect[] = [];
  for (const [slot, uid] of Object.entries(slots)) {
    const item = s.inventory.find((i) => i.uid === uid);
    if (item) out.push(getKeepsake(item.id).effects[slot as SlotId].effect);
  }
  return out;
}

export function loadSave(): SaveState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SaveState;
    if (s.version !== 1) return null;
    // 舊存檔沒有信物欄位
    return { ...s, inventory: s.inventory ?? [], equipment: s.equipment ?? {}, nextUid: s.nextUid ?? 1, shards: s.shards ?? {}, generation: s.generation ?? 1, materials: s.materials ?? {} };
  } catch {
    return null;
  }
}

export function writeSave(s: SaveState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* 無痕模式等:不存也能玩 */
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}

// ── 招募 ──────────────────────────────────────────────
export function addShards(s: SaveState, gains: Record<string, number>): SaveState {
  const shards = { ...s.shards };
  for (const [id, n] of Object.entries(gains)) if (!s.party.includes(id)) shards[id] = (shards[id] ?? 0) + n;
  return { ...s, shards };
}

export function canRecruit(s: SaveState, heroId: string): boolean {
  const h = getHero(heroId);
  return !!h.recruit && !s.party.includes(heroId) && (s.shards[heroId] ?? 0) >= h.recruit.need;
}

/** 招募:以同伴的平均等級加入,才跟得上 */
export function recruit(s: SaveState, heroId: string): SaveState {
  if (!canRecruit(s, heroId)) return s;
  const avg = Math.round(s.party.reduce((n, id) => n + s.heroes[id].level, 0) / s.party.length);
  const hero = { ...newHero(heroId), level: avg, unspent: (avg - 1) * POINTS_PER_LEVEL };
  return { ...s, party: [...s.party, heroId], heroes: { ...s.heroes, [heroId]: hero } };
}

// ── 祖名傳承 ──────────────────────────────────────────
/** 跨入新的一代:等級保留一半(至少 2)、經驗歸零、自由點數全部退回;信物與足跡保留 */
export function inherit(s: SaveState, generation: number, floor = 2): SaveState {
  if (s.generation >= generation) return s;
  const heroes: SaveState["heroes"] = {};
  for (const [id, h] of Object.entries(s.heroes)) {
    const level = Math.max(floor, Math.ceil(h.level / 2));
    heroes[id] = { ...h, level, xp: 0, bonus: { str: 0, agi: 0, int: 0, spi: 0, vit: 0 }, unspent: (level - 1) * POINTS_PER_LEVEL };
  }
  return { ...s, heroes, generation };
}

// ── 材料與信物升級 ────────────────────────────────────
export function addMaterials(s: SaveState, gains: Partial<Record<MaterialId, number>>): SaveState {
  const materials = { ...s.materials };
  for (const [k, n] of Object.entries(gains)) materials[k as MaterialId] = (materials[k as MaterialId] ?? 0) + (n ?? 0);
  return { ...s, materials };
}

export function upgradeCost(level: number): Partial<Record<MaterialId, number>> | null {
  return level >= MAX_KEEPSAKE_LEVEL ? null : UPGRADE_COST[level];
}

export function canUpgrade(s: SaveState, uid: string): boolean {
  const item = s.inventory.find((i) => i.uid === uid);
  const cost = item && upgradeCost(item.level ?? 1);
  return !!cost && Object.entries(cost).every(([m, n]) => (s.materials[m as MaterialId] ?? 0) >= (n ?? 0));
}

export function upgradeKeepsake(s: SaveState, uid: string): SaveState {
  if (!canUpgrade(s, uid)) return s;
  const item = s.inventory.find((i) => i.uid === uid)!;
  const cost = upgradeCost(item.level ?? 1)!;
  const materials = { ...s.materials };
  for (const [m, n] of Object.entries(cost)) materials[m as MaterialId] = (materials[m as MaterialId] ?? 0) - (n ?? 0);
  return { ...s, materials, inventory: s.inventory.map((i) => (i.uid === uid ? { ...i, level: (i.level ?? 1) + 1 } : i)) };
}

/** 英雄身上信物等級帶來的加成 */
export function heroCharmBonus(s: SaveState, heroId: string): { dmg: number; guard: number; hp: number } {
  const out = { dmg: 0, guard: 0, hp: 0 };
  for (const [slot, uid] of Object.entries(s.equipment?.[heroId] ?? {})) {
    const item = s.inventory.find((i) => i.uid === uid);
    if (!item) continue;
    const b = slotBonus(slot as SlotId, item.level ?? 1);
    if (slot === "brow") out.dmg += b;
    if (slot === "chest") out.guard += b;
    if (slot === "navel") out.hp += b;
  }
  return out;
}
