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
  // ── 沿著記號追上來的族人(集滿足跡就能招募) ──
  {
    id: "mata",
    name: "瑪塔",
    roman: "Mata",
    etymology: "原始南島語 *maCa「眼睛」。",
    title: "Hanup・追跡獵手",
    classId: "hanup-1",
    facing: "right",
    bio: "十四歲,村裡眼睛最尖的獵手。巴度出發那天她在山上打獵,回來發現他們不見了,氣得背起弓就追。",
    recruit: {
      shard: "羽箭",
      need: 6,
      story: [
        { speaker: "mata", text: "找到你們了!一路上的羽箭記號,都是我射在雪地上的。" },
        { speaker: "batu", text: "瑪塔?妳一個人跟過來的?" },
        { speaker: "mata", text: "哼,你們三個連鹿的腳印都看不懂,沒有我怎麼辦。遠一點的野獸,交給我的弓。" },
      ],
    },
  },
  {
    id: "kasiw",
    name: "卡西",
    roman: "Kasiw",
    etymology: "原始南島語 *kaSiw「樹」。",
    title: "Vukid・林之子",
    classId: "vukid-1",
    facing: "right",
    bio: "十三歲,不太說話,在森林裡卻像回到家。老祭司說他聽得懂樹的聲音,有時還會變成熊。",
    recruit: {
      shard: "樹苗",
      need: 6,
      story: [
        { speaker: "kasiw", text: "……(把一株小樹苗種在雪地裡,抬頭看了看大家)" },
        { speaker: "danum", text: "是卡西!你一路種著這些樹苗過來的?" },
        { speaker: "kasiw", text: "嗯。這樣回去的人,就找得到路。……我也想去看那座山。" },
      ],
    },
  },
  {
    id: "bulan",
    name: "布蘭",
    roman: "Bulan",
    etymology: "原始南島語 *bulaN「月亮」。",
    title: "Hanitu・月下靈語者",
    classId: "hanitu-1",
    facing: "right",
    bio: "十五歲,聽得見萬物之靈(hanitu)說話。她說野獸撲上來之前,心裡會先喊出要撲向誰。",
    recruit: {
      shard: "月貝",
      need: 6,
      story: [
        { speaker: "bulan", text: "月亮每晚都掛在你們前面,我只要跟著月光走就好了。" },
        { speaker: "bitu", text: "妳……也看得見星星在往東走?" },
        { speaker: "bulan", text: "我聽得見。山林裡的靈說,有人要去太陽升起的地方。我來幫你們聽野獸在想什麼。" },
      ],
    },
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
