/**
 * 六大職業系 — 以台灣原住民族語命名(語源與查證來源見 docs/NAMES.md)
 *
 *   Kapah  狂戰士系  阿美語「青年、壯丁」        怒氣
 *   Inibs  薩滿系    西拉雅語「女祭司」(荷蘭文獻) 靈力
 *   Vukid  德魯伊系  排灣語「森林」               靈力
 *   Rikat  法師系    西拉雅語「閃電」             靈力
 *   Hanitu 靈語系    布農語「精靈」               靈力
 *   Hanup  獵手系    布農語「狩獵」               怒氣
 *
 * 第一景只有 Kapah / Inibs / Rikat 三系上場,其他三系先定義好、之後的章節加入。
 */
import type { AttrId, Attrs, ClassDef, FamilyDef, FamilyId } from "./types";

export const ATTR_NAMES: Record<AttrId, { name: string; desc: string }> = {
  str: { name: "力", desc: "近戰與物理技能的威力" },
  agi: { name: "敏", desc: "暴擊率,也提升射擊威力" },
  int: { name: "智", desc: "法術威力與靈力上限" },
  spi: { name: "靈", desc: "治療量、靈力回復與法術抗性" },
  vit: { name: "體", desc: "生命上限與物理防禦" },
};

export const FAMILIES: FamilyDef[] = [
  {
    id: "kapah",
    name: "Kapah",
    zh: "狂戰士系",
    etymology: "阿美語,意為「青年、壯丁」——部落裡扛起戰鬥與勞動的年輕人。",
    resource: "rage",
    color: "#c0532f",
    desc: "站在最前面的人。挨打與出手都會累積怒氣,用怒氣換來橫掃一切的斧技。",
    passive: { name: "狂血", desc: "生命越低,傷害越高(最多 +40%)。" },
  },
  {
    id: "inibs",
    name: "Inibs",
    zh: "薩滿系",
    etymology: "西拉雅語,17 世紀荷蘭文獻記載的女祭司。遊戲中是史前的古祭司。",
    resource: "mana",
    color: "#3f8f86",
    desc: "與祖靈對話的人。治療、立起圖騰守護同伴,也能擊響雷鼓。",
    passive: { name: "祖靈庇佑", desc: "治療量 +20%;相鄰的同伴承傷 −10%。" },
  },
  {
    id: "vukid",
    name: "Vukid",
    zh: "德魯伊系",
    etymology: "排灣語,意為「森林、林木茂密的內山」;與西拉雅語 vukin(山)同源。",
    resource: "mana",
    color: "#5b8a3a",
    desc: "森林的孩子。以藤蔓束縛敵人、化身野獸、讓草木為同伴療傷。",
    passive: { name: "林息", desc: "站在森林中時每回合回復生命。" },
  },
  {
    id: "rikat",
    name: "Rikat",
    zh: "法師系",
    etymology: "西拉雅語,意為「閃電」。",
    resource: "mana",
    color: "#4a63b8",
    desc: "讀懂天象的人。從遠處召來星屑、寒星與落雷,身子卻很單薄。",
    passive: { name: "天眼", desc: "法術暴擊時傷害 ×1.75(一般為 ×1.5)。" },
  },
  {
    id: "hanitu",
    name: "Hanitu",
    zh: "靈語系",
    etymology: "布農語,意為「精靈」——萬物皆有的靈。本系是與精靈對話、請求相助的人。",
    resource: "mana",
    color: "#7a5a9a",
    desc: "聽得見萬物之靈的人。請先人的靈魂短暫歸來並肩作戰,也能安撫躁動的亡魂。",
    passive: { name: "靈聽", desc: "看得見敵人下一步要打誰。" },
  },
  {
    id: "hanup",
    name: "Hanup",
    zh: "獵手系",
    etymology: "布農語,意為「狩獵」。",
    resource: "rage",
    color: "#a07a2a",
    desc: "最遠的一擊。弓、標槍與陷阱,追蹤獵物的弱點。",
    passive: { name: "追獵", desc: "對生命低於一半的目標傷害 +25%。" },
  },
];

const familyById = new Map(FAMILIES.map((f) => [f.id, f]));
export function getFamily(id: FamilyId): FamilyDef {
  const f = familyById.get(id);
  if (!f) throw new Error(`Unknown family: ${id}`);
  return f;
}

const A = (str: number, agi: number, int: number, spi: number, vit: number): Attrs => ({ str, agi, int, spi, vit });

export const CLASSES: ClassDef[] = [
  {
    id: "kapah-1",
    family: "kapah",
    name: "斧之青年",
    move: 4,
    base: A(9, 5, 2, 3, 8),
    growth: { str: 2, vit: 2, agi: 1 },
    armor: 3,
    basic: "axe",
    skills: [
      { level: 1, skill: "whirl" },
      { level: 2, skill: "charge" },
      { level: 3, skill: "roar" },
    ],
  },
  {
    id: "inibs-1",
    family: "inibs",
    name: "骨鈴祭司",
    move: 3,
    base: A(3, 4, 5, 9, 6),
    growth: { spi: 2, vit: 1, int: 1 },
    armor: 1,
    basic: "bell",
    skills: [
      { level: 1, skill: "breath" },
      { level: 2, skill: "totem" },
      { level: 3, skill: "drum" },
    ],
  },
  {
    id: "rikat-1",
    family: "rikat",
    name: "觀星者",
    move: 3,
    base: A(2, 5, 10, 5, 5),
    growth: { int: 3, spi: 1 },
    armor: 0,
    basic: "mote",
    skills: [
      { level: 1, skill: "bolt" },
      { level: 2, skill: "frostline" },
      { level: 3, skill: "meteor" },
    ],
  },
];

const classById = new Map(CLASSES.map((c) => [c.id, c]));
export function getClass(id: string): ClassDef {
  const c = classById.get(id);
  if (!c) throw new Error(`Unknown class: ${id}`);
  return c;
}

/** 每升一級可自由分配的點數 */
export const POINTS_PER_LEVEL = 3;
export const XP_PER_LEVEL = 100;
export const MAX_LEVEL = 10;
