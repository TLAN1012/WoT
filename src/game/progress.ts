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
import type { AttrId, Attrs, CharmEffect, DifficultyId, HeroProgress, SaveState, SlotId } from "./types";

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
    mag: a.int * 2 + (cls.family === "inibs" ? a.spi : 0),
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
    difficulty,
    party,
    heroes: Object.fromEntries(party.map((id) => [id, newHero(id)])),
    stars: {},
    seenIntro: [],
    inventory: [],
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
    return { ...s, inventory: s.inventory ?? [], equipment: s.equipment ?? {}, nextUid: s.nextUid ?? 1 };
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
