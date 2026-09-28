/**
 * 第二景・海漲(約一萬年前,冰河期結束)
 *
 * 史實基礎:末次冰期結束後海平面快速上升,台灣海峽的陸橋沉入海中;
 * 高雄的壽山(柴山)是隆起的珊瑚礁石灰岩,山上有許多洞穴,至今仍有台灣獼猴。
 * 雲豹、台灣黑熊、山豬都是台灣原生動物。故事是奇幻詮釋。
 *
 * 地圖字元:b 沙灘  g 草地  J 闊葉林  C 珊瑚礁台地  c 洞穴  R 亂石  F 營火  ~ 海  = 淺灘
 */
import type { BattleDef, Cell, ChapterDef, Tide } from "../types";

const DEFEAT = [{ text: "大家退回安全的地方,互相包紮傷口。祖先走過更難的路——再試一次吧。" }];

function cellsWhere(map: string[], pred: (ch: string, col: number, row: number) => boolean): Cell[] {
  const out: Cell[] = [];
  map.forEach((line, row) => [...line].forEach((ch, col) => pred(ch, col, row) && out.push([col, row])));
  return out;
}

/** 海從西邊一欄一欄推進:先淺灘、下一波變海(珊瑚礁與亂石不會被淹) */
function tideSchedule(map: string[], start: number, every: number, width: number, lastCol: number): Tide[] {
  const tides: Tide[] = [];
  const land = (col0: number, col1: number) => cellsWhere(map, (ch, col) => col >= col0 && col <= col1 && ch !== "~" && ch !== "C" && ch !== "R");
  let turn = start;
  for (let c = 0; c <= lastCol; c += width) {
    tides.push({ turn, cells: land(c, c + width - 1), to: "shallows", text: c === 0 ? "海水開始漲了!西邊的草地變成了淺灘。" : undefined });
    tides.push({ turn: turn + every, cells: land(c, c + width - 1), to: "sea", text: c === 0 ? "淺灘沉進了海裡。快往東邊的珊瑚礁跑!" : undefined });
    turn += every;
  }
  return tides;
}

const TIDE_MAP = [
  "~~~bbggJJJggCCC",
  "~~bbgggJJgggCCC",
  "~bbgggggggJJCCC",
  "~bbggRggggJJCCC",
  "~bbgggggggggCCC",
  "~bbggggJJggggCC",
  "~bbgggJJJgggCCC",
  "~~bbgggggggRCCC",
  "~~~bbggggJJgCCC",
  "~~~~bbggJJJgCCC",
];

const B1: BattleDef = {
  id: "c2-tide",
  music: { slot: "battle", variant: "a" },
  reward: "conch",
  winArt: "win-tide",
  deploy: [[2, 2], [3, 2], [2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [4, 4], [2, 5], [3, 5], [4, 5], [3, 6]],
  maxHeroes: 4,
  shards: { first: { bulan: 2 }, replay: ["mata", "kasiw", "bulan"] },
  title: "海漲",
  subtitle: "被海吞沒的草原・春天的大潮",
  art: "tide",
  objective: { kind: "reach", cells: cellsWhere(TIDE_MAP, (ch) => ch === "C") },
  objectiveText: "趕在海水之前,讓所有人登上東邊的珊瑚礁台地",
  parTurns: 6,
  node: { x: 22, y: 58 },
  map: TIDE_MAP,
  heroes: [
    { heroId: "batu", cell: [4, 4] },
    { heroId: "danum", cell: [3, 3] },
    { heroId: "bitu", cell: [3, 5] },
    { heroId: "mata", cell: [2, 4] },
  ],
  enemies: [
    { id: "b1", defId: "boar", cell: [7, 2] },
    { id: "b2", defId: "boar", cell: [8, 6] },
    { id: "l1", defId: "leopard", cell: [9, 5] },
    { id: "l2", defId: "leopard", cell: [10, 2] },
    { id: "b3", defId: "boar", cell: [11, 4] },
  ],
  waves: [{ turn: 3, text: "被海水逼上岸的山豬又衝出來兩頭!", units: [{ id: "b4", defId: "boar", cell: [9, 9] }, { id: "b5", defId: "boar", cell: [8, 0] }] }],
  tides: tideSchedule(TIDE_MAP, 2, 1, 2, 11),
  intro: [
    { text: "春天的大潮來得特別兇。一夜之間,海水吞掉了半片草原。" },
    { speaker: "mata", text: "海水在追我們!往珊瑚礁上跑!" },
    { speaker: "batu", text: "山豬也被海逼瘋了,擋在路上——小心!" },
    { text: "【漲潮】每回合開始,海水會從西邊往東推進:先變成淺灘(走得慢),下一回合再變成海。讓所有人登上東邊的珊瑚礁台地就算勝利。被海淹到的人會被浪推上岸。" },
  ],
  outro: [
    { text: "族人們擠在珊瑚礁頂上,看著海水慢慢退回去——但它不會全部退回去了。" },
    { speaker: "danum", text: "祖先走過的那條路,現在沉在海底了。" },
    { speaker: "bitu", text: "那我們就在這裡,看星星從海上升起來。" },
  ],
  defeat: DEFEAT,
};

const B2: BattleDef = {
  id: "c2-cave",
  music: { slot: "battle", variant: "b" },
  reward: "handprint",
  winArt: "win-cave",
  deploy: [[2, 2], [3, 2], [2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [4, 4], [2, 5], [3, 5], [4, 5], [3, 6]],
  maxHeroes: 4,
  shards: { first: { bulan: 2 }, replay: ["kasiw", "bulan"] },
  title: "柴山洞穴",
  subtitle: "珊瑚礁山丘上的石灰岩洞",
  art: "chaishan",
  objective: { kind: "rout" },
  objectiveText: "趕走猴群與洞穴裡的黑熊",
  parTurns: 8,
  node: { x: 45, y: 32 },
  map: [
    "~~bbgJJJCCCCCC",
    "~bbggJJCCcccCC",
    "~bbggJCCccccCC",
    "~bbgggCcccFccC",
    "~bbggggccccccC",
    "~bbgggCCcccccC",
    "~bbggJJCCcccCC",
    "~~bbgJJJCCCCCC",
    "~~bbggJJJJCCCC",
    "~~~bbgggJJJCCC",
  ],
  heroes: [
    { heroId: "batu", cell: [4, 4] },
    { heroId: "danum", cell: [3, 3] },
    { heroId: "bitu", cell: [3, 5] },
    { heroId: "kasiw", cell: [2, 4] },
  ],
  enemies: [
    { id: "m1", defId: "macaque", cell: [6, 1] },
    { id: "m2", defId: "macaque", cell: [7, 6] },
    { id: "m3", defId: "macaque", cell: [8, 2] },
    { id: "m4", defId: "macaque", cell: [6, 8] },
    { id: "m5", defId: "macaque", cell: [9, 5] },
    { id: "bear", defId: "bear", cell: [11, 4] },
  ],
  waves: [{ turn: 3, text: "樹上又跳下三隻猴子,尖叫著丟石頭!", units: [{ id: "m6", defId: "macaque", cell: [8, 0] }, { id: "m7", defId: "macaque", cell: [10, 7] }, { id: "m8", defId: "macaque", cell: [9, 9] }] },
    { turn: 4, text: "血腥味引來了兩頭雲豹,從林子裡悄悄摸了過來!", units: [{ id: "l1", defId: "leopard", cell: [6, 0] }, { id: "l2", defId: "leopard", cell: [7, 8] }] }],
  intro: [
    { text: "珊瑚礁山丘上有好多洞穴。洞裡能擋風擋雨,是過冬最好的地方。" },
    { speaker: "kasiw", text: "……洞裡有東西在呼吸。" },
    { text: "猴群在樹上尖叫,石子一顆顆丟下來。洞穴深處,一雙眼睛亮了起來——是黑熊。" },
    { speaker: "batu", text: "我們只想借一個地方過冬……可是牠們不打算讓。" },
    { text: "【提示】洞穴承傷 −30%。黑熊是「巨」,怕「靈」;猴子是「獸」,怕巴度的「斧」。" },
  ],
  outro: [
    { text: "黑熊退回了山裡。族人把紅色的赭土塗在手上,在洞壁上印下一個一個手印。" },
    { speaker: "mata", text: "這樣以後的孩子就知道,我們來過這裡。" },
  ],
  defeat: DEFEAT,
};

const B3: BattleDef = {
  id: "c2-boargod",
  music: { slot: "boss", variant: "a" },
  reward: "boar-tusk",
  winArt: "win-boar",
  deploy: [[1, 2], [2, 2], [1, 3], [2, 3], [3, 3], [2, 4], [3, 4], [1, 5], [2, 5], [3, 5], [2, 6], [3, 6]],
  maxHeroes: 4,
  shards: { first: { bulan: 2 }, replay: ["bulan"] },
  title: "山豬神",
  subtitle: "山林與海岸的交界",
  art: "boargod",
  objective: { kind: "purify", unitId: "boargod" },
  objectiveText: "讓山豬神平靜下來(把牠的生命打到 0)",
  parTurns: 10,
  node: { x: 72, y: 46 },
  map: [
    "bbggggggJJJJJJJ",
    "bbgggggggJJJJJJ",
    "bbggggRggggJJJJ",
    "bbggggRgggggJJJ",
    "bFgggggggggggJJ",
    "bbggggggggggggJ",
    "bbgggJJgggggJJJ",
    "bbggJJJggggJJJJ",
    "bbgggJggggJJJJJ",
    "bbbggggggJJJJJJ",
    "~bbbggggJJJJJJJ",
  ],
  heroes: [
    { heroId: "batu", cell: [3, 4] },
    { heroId: "danum", cell: [2, 4] },
    { heroId: "bitu", cell: [2, 5] },
    { heroId: "bulan", cell: [3, 5] },
  ],
  enemies: [
    { id: "boargod", defId: "boargod", cell: [12, 5] },
    { id: "b1", defId: "boar", cell: [10, 3] },
    { id: "b2", defId: "boar", cell: [11, 7] },
    { id: "b3", defId: "boar", cell: [9, 8] },
    { id: "l1", defId: "leopard", cell: [8, 6] },
  ],
  intro: [
    { text: "平原被海淹沒之後,山豬們失去了牠們的家。" },
    { text: "一個清晨,山上傳來像雷一樣的聲音。" },
    { speaker: "boargod", text: "(巨大的白色山豬神從林中衝出,身上的傷疤還滲著血。牠的眼睛裡,是憤怒,也是悲傷。)" },
    { speaker: "bulan", text: "牠在說……海奪走了牠們的平原,牠們只能往山上逃,可是山上已經有了別人。" },
    { speaker: "danum", text: "我們也是被海趕上來的。先讓牠停下來,我們得跟牠說話。" },
    { text: "【提示】山豬神是「巨」,怕「靈」,剋「斧」。牠會呼喚山豬群、會衝撞與踐踏。" },
  ],
  outro: [
    { text: "山豬神終於停了下來,喘著氣,低下了頭。" },
    { speaker: "boargod", text: "(牠折下一小截獠牙,放在達努的腳邊。)" },
    { speaker: "danum", text: "牠說:山是牠們的,海邊是我們的。各自守著各自的地方,不要再互相傷害。" },
  ],
  defeat: DEFEAT,
};

export const CHAPTER_2: ChapterDef = {
  id: "ch2",
  generation: 2,
  requires: "ch1",
  title: "第二景・海漲",
  subtitle: "冰河退去,海水淹沒了來時的路",
  era: "約一萬年前・冰河期結束",
  mapArt: "ch2map",
  intro: [
    { text: "巴度他們走過陸橋之後,又過了很多、很多年。", image: "ceremony" },
    { text: "冰河退去,海水一年比一年高。祖先走過的那條路,只剩下老人口中的故事。", image: "ceremony" },
    { text: "這一年的月圓之夜,族人圍著營火,為孩子們承襲祖先的名字。長老一個一個念:「從今天起,你叫巴度。你叫達努。你叫比杜……」", image: "ceremony" },
    { speaker: "batu", text: "巴度……就是那個走過海的巴度?", image: "ceremony" },
    { speaker: "danum", text: "承了祖先的名字,也要帶著祖先的心。", image: "ceremony" },
    { text: "名字傳了下去,信物也傳了下去。可是海,還在漲。", image: "ceremony" },
    { text: "【祖名傳承】英雄的等級保留一半,自由點數全部退回、可以重新分配;信物與收集到的足跡都保留。", image: "ceremony" },
  ],
  epilogue: [
    { text: "海,終於停了下來。", image: "settle" },
    { text: "海灣裡有了獨木舟,洞壁上有了手印。山上的山豬和海邊的人,守著一個古老的約定。", image: "settle" },
    { text: "很多很多年以後,這一帶被叫作 Takau——打狗。", image: "settle" },
    { text: "名字,還會一代一代傳下去。", image: "settle" },
    { text: "——第二景・海漲,完。", image: "settle" },
  ],
  battles: [B1, B2, B3],
};
