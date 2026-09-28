/**
 * 英雄。第一景的三人從東亞大陸東南沿海出發,
 * 名字取自原始南島語/原始馬來-玻里尼西亞語的重建詞(Blust & Trussel, Austronesian Comparative Dictionary)。
 */
import type { HeroDef, SpeakerDef } from "./types";

export const HEROES: HeroDef[] = [
  {
    id: "batu",
    name: "巴度",
    roman: "Batu",
    etymology: "原始馬來-玻里尼西亞語 *batu「石頭」(原始南島語 *batux)。",
    title: "Kapah・斧之青年",
    classId: "kapah-1",
    facing: "right",
    bio: "十五歲,村裡最會打架也最不會安靜的少年。父親在去年冬天的獵鹿途中沒有回來,留給他一把石斧。",
  },
  {
    id: "danum",
    name: "達努",
    roman: "Danum",
    etymology: "原始南島語 *daNum「淡水」。",
    title: "Inibs・骨鈴祭司",
    classId: "inibs-1",
    facing: "right",
    bio: "十六歲,老祭司的徒弟。夢見太陽升起的地方有一座青色的高山,決定帶著大家往東走。",
  },
  {
    id: "bitu",
    name: "比杜",
    roman: "Bitu",
    etymology: "原始南島語 *bituqen「星星」。",
    title: "Rikat・觀星者",
    classId: "rikat-1",
    facing: "right",
    bio: "十二歲,話很少,夜裡總是在數星星。某天他舉起黑曜石杖,天上就落下了一道閃電。",
  },
];

const byId = new Map(HEROES.map((h) => [h.id, h]));
export function getHero(id: string): HeroDef {
  const h = byId.get(id);
  if (!h) throw new Error(`Unknown hero: ${id}`);
  return h;
}

/** 劇情說話者:英雄 + 會出場的神獸 */
export const SPEAKERS: SpeakerDef[] = [
  ...HEROES.map((h) => ({ id: h.id, name: h.name, title: h.title, facing: h.facing })),
  { id: "grayfang", name: "灰牙", title: "鬣狗群的首領", facing: "left" },
  { id: "tiger", name: "雪紋虎", title: "沉默的獵者", facing: "left" },
  { id: "elephant", name: "古象神", title: "被寒祟附身的古菱齒象", facing: "left" },
];

const speakerById = new Map(SPEAKERS.map((s) => [s.id, s]));
export function getSpeaker(id: string): SpeakerDef | undefined {
  return speakerById.get(id);
}
