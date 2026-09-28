/**
 * 第一景・跨海東來(約兩萬年前,末次冰盛期)
 *
 * 史實基礎:末次冰盛期海平面比現在低一百公尺以上,平均深度約六十公尺的台灣海峽大片露出成陸地;
 * 澎湖水道打撈出大量更新世哺乳動物化石(古菱齒象、斑鬣狗、老虎、水牛、鹿……),
 * 以及「澎湖原人」的下顎骨。澎湖的玄武岩柱狀節理台地當時是陸橋上的高地。
 * 故事是奇幻詮釋:三個孩子從大陸東南沿海走過陸橋,來到台灣。
 *
 * 地圖字元:. 凍原  * 積雪  i 冰面  B 玄武岩台地  T 針葉林  = 淺灘  m 凍沼  ~ 海  R 亂石  F 營火
 */
import type { BattleDef, ChapterDef } from "../types";

const DEFEAT = [{ text: "三人撤回安全的地方,包紮傷口、重新生火。休息一下,再試一次吧。" }];

const B1: BattleDef = {
  id: "c1-shore",
  music: { slot: "battle", variant: "a" },
  reward: "hyena-head",
  winArt: "win-shore",
  title: "離岸",
  subtitle: "大陸東南海岸・黎明",
  art: "coast",
  objective: { kind: "rout" },
  objectiveText: "擊退鬣狗群",
  parTurns: 7,
  node: { x: 12, y: 58 },
  map: [
    "~~~~..TT..**.",
    "~~~...TT...*.",
    "~~.....R..mm.",
    "~......R...m.",
    "~..........T.",
    "~~...ii....TT",
    "~~..iii..*..T",
    "~~~..i..***..",
    "~~~~....**...",
  ],
  heroes: [
    { heroId: "batu", cell: [4, 4] },
    { heroId: "danum", cell: [2, 3] },
    { heroId: "bitu", cell: [2, 5] },
  ],
  enemies: [
    { id: "h1", defId: "hyena", cell: [10, 1] },
    { id: "h2", defId: "hyena", cell: [12, 3] },
    { id: "h3", defId: "hyena", cell: [10, 6] },
    { id: "h4", defId: "hyena", cell: [12, 7] },
  ],
  waves: [
    {
      turn: 3,
      text: "霧裡又鑽出兩隻鬣狗!",
      units: [
        { id: "h5", defId: "hyena", cell: [12, 0] },
        { id: "h6", defId: "hyena", cell: [12, 8] },
      ],
    },
  ],
  intro: [
    { text: "冬天越來越長。鹿群往東遷徙,追著鹿群出去的獵人,一個一個沒有回來。" },
    { speaker: "danum", text: "我又夢見了。太陽升起的地方有一座青色的高山,山上的樹,從來不會結霜。" },
    { speaker: "batu", text: "又是那個夢?老祭司說,那只是夢。" },
    { speaker: "danum", text: "老祭司也說過,夢是祖靈借我們的眼睛。巴度,我要去看看。" },
    { speaker: "batu", text: "……我阿爸就是往東追鹿群,才沒回來的。要去,我跟妳去。" },
    { speaker: "bitu", text: "(抱著黑曜石杖,點了點頭)星星也往東邊走。我也去。" },
    { text: "天還沒亮,三個人離開了海邊的村子。走不到半天,霧裡就傳來了笑聲——那是鬣狗。" },
    { speaker: "batu", text: "牠們想圍住我們!比杜、達努,站到我後面!" },
    { text: "【教學】點選英雄 → 點金色格子移動 → 再選技能、點紅色目標出手。每人每回合移動一次、行動一次。走進敵人身邊的格子就會停下,用巴度擋在前面保護比杜。" },
  ],
  outro: [
    { speaker: "danum", text: "大家都沒事吧?……巴度,你的手在流血。" },
    { speaker: "batu", text: "小傷。倒是比杜,剛剛那道閃電是怎麼回事?" },
    { speaker: "bitu", text: "天上的 Rikat……好像聽得懂我在說什麼。" },
    { text: "三人把鬣狗留給烏鴉,繼續向東。第三天,地平線上浮起了一排黑色的高台。" },
  ],
  defeat: DEFEAT,
};

const B2: BattleDef = {
  id: "c1-basalt",
  music: { slot: "battle", variant: "b" },
  reward: "basalt-shard",
  winArt: "win-basalt",
  title: "玄武岩之夜",
  subtitle: "陸橋中央的黑色高台(今日的澎湖)",
  art: "penghu",
  objective: { kind: "survive", turns: 8, orBoss: "grayfang" },
  objectiveText: "守住台地撐到天亮(8 回合),或擊退首領灰牙",
  parTurns: 6,
  node: { x: 37, y: 52 },
  map: [
    "**..TT...**..",
    "*...T..R..*..",
    "...RBBBBR....",
    "..BBBBBBBB...",
    ".RBBBFBBBBR..",
    "..BBBBBBBB...",
    "...RBBBBBR...",
    "*....BBR....*",
    "**..T.....TT*",
    "*..TT..mm..**",
    "~~~~..mm..~~~",
  ],
  heroes: [
    { heroId: "batu", cell: [6, 4] },
    { heroId: "danum", cell: [5, 3] },
    { heroId: "bitu", cell: [4, 4] },
  ],
  enemies: [
    { id: "h1", defId: "hyena", cell: [0, 0] },
    { id: "h2", defId: "hyena", cell: [12, 1] },
    { id: "h3", defId: "hyena", cell: [12, 9] },
    { id: "h4", defId: "hyena", cell: [0, 9] },
  ],
  waves: [
    { turn: 2, text: "東西兩側又有鬣狗爬上台地!", units: [{ id: "h5", defId: "hyena", cell: [12, 5] }, { id: "h6", defId: "hyena", cell: [0, 6] }] },
    {
      turn: 3,
      text: "一聲低沉的長嚎——鬣狗群的首領「灰牙」來了!擊退牠,鬣狗群就會散去。",
      units: [
        { id: "grayfang", defId: "grayfang", cell: [12, 3] },
        { id: "h7", defId: "hyena", cell: [11, 2] },
      ],
    },
    { turn: 5, text: "南邊的沼澤裡,一雙琥珀色的眼睛亮了起來。是雪紋虎!", units: [{ id: "tiger", defId: "tiger", cell: [5, 10] }] },
    { turn: 6, text: "天快亮了,鬣狗群發動最後一波攻勢!", units: [{ id: "h8", defId: "hyena", cell: [0, 3] }, { id: "h9", defId: "hyena", cell: [12, 7] }] },
  ],
  intro: [
    { text: "陸橋的中央,是一片黑色的石台。石頭一根一根立著,每一根都有六個邊,像是巨人插下的石柱。" },
    { speaker: "bitu", text: "這裡的石頭……每一根都是六角形的。" },
    { speaker: "danum", text: "看,有人在這裡生過火。灰燼還是溫的。" },
    { speaker: "batu", text: "可是這腳印好大,腳趾也不一樣。這不是我們的人。" },
    { speaker: "danum", text: "是很古老的人。祖靈說,他們比我們更早走過這條路。" },
    { text: "入夜後,台地四周亮起了一雙雙綠色的眼睛。白天那群鬣狗的同伴找來了。" },
    { speaker: "batu", text: "守住營火,撐到天亮!" },
    { text: "【提示】玄武岩台地承傷 −20%,站在上面的遠程技能射程 +1。營火每回合回復 15% 生命。" },
  ],
  outro: [
    { text: "東方泛白。灰牙帶著傷,領著剩下的鬣狗退進了霧裡。" },
    { speaker: "tiger", text: "(雪紋虎在遠處的岩石上看了他們很久,然後轉身離開。這三隻小獵物,好像值得被牠記住。)" },
    { speaker: "danum", text: "走吧。祖靈說,前面還有一位……很痛苦的神。" },
  ],
  defeat: DEFEAT,
};

const B3: BattleDef = {
  id: "c1-blight",
  music: { slot: "boss", variant: "a" },
  reward: "elephant-blessing",
  winArt: "win-blight",
  title: "寒祟古象",
  subtitle: "陸橋東端・濃霧中的冰原",
  art: "blight",
  objective: { kind: "purify", unitId: "elephant" },
  objectiveText: "淨化古象神(把牠的生命打到 0)",
  parTurns: 9,
  node: { x: 70, y: 56 },
  map: [
    "TTT..**....TTTT",
    "TT...*..ii..TTT",
    "T.....iiii...TT",
    "......iiii....T",
    "..F...........=",
    "......RR......=",
    "..............=",
    "T....*..ii...=~",
    "TT..***.ii..==~",
    "TTT..**....==~~",
    "TTTT......==~~~",
  ],
  heroes: [
    { heroId: "batu", cell: [3, 5] },
    { heroId: "danum", cell: [2, 4] },
    { heroId: "bitu", cell: [1, 6] },
  ],
  enemies: [
    { id: "elephant", defId: "elephant", cell: [12, 5] },
    { id: "w1", defId: "wisp", cell: [8, 1] },
    { id: "w2", defId: "wisp", cell: [9, 3] },
    { id: "w3", defId: "wisp", cell: [10, 7] },
  ],
  intro: [
    { text: "越往東走,霧越濃,地上的冰也越來越青。" },
    { text: "然後,大地開始震動。" },
    { speaker: "elephant", text: "(一聲長嘯,震落了樹上所有的雪。牠的身上爬滿了黑色的觸手與冰晶。)" },
    { speaker: "bitu", text: "好……好大……" },
    { speaker: "danum", text: "是古象神。牠被寒祟附身了。冰河的寒氣鑽進牠的身體,讓牠痛得發狂。" },
    { speaker: "batu", text: "要我們打倒一位神?" },
    { speaker: "danum", text: "不是打倒,是救牠。把牠身上的寒祟打散,牠就會醒過來。寒祟怕火,撐不住的時候就退回營火邊。" },
    { speaker: "batu", text: "……好。那就救牠!" },
    { text: "【提示】古象神的「踐踏」會讓身邊的人暈眩,「寒霜吐息」是一條直線,別排成一列。牠每隔幾回合會生出寒祟。" },
  ],
  outro: [
    { text: "最後一道閃電落下。纏在古象神身上的黑色觸手化成了雪,隨風散去。" },
    { speaker: "elephant", text: "(巨象低下頭,用長鼻輕輕碰了碰達努的額頭,轉身走進了霧裡。)" },
    { speaker: "danum", text: "牠說,謝謝。牠還說,東邊的山在等我們。" },
  ],
  defeat: DEFEAT,
};

export const CHAPTER_1: ChapterDef = {
  id: "ch1",
  title: "第一景・跨海東來",
  subtitle: "冰河時期的陸橋上,三個孩子走向太陽升起的地方",
  era: "約兩萬年前・末次冰盛期",
  mapArt: "map",
  intro: [
    { text: "兩萬年前,世界還很冷。北方的冰原鎖住了大量的水,海面比今天低了一百多公尺。" },
    { text: "大陸東南海岸外,原本是海峽的地方露出了一片廣闊的原野。古象、水牛、鹿群與鬣狗在上面來來去去。" },
    { text: "這是一個傳說的開始:三個孩子,走過了那條路。" },
  ],
  epilogue: [
    { text: "霧散了。", image: "sunrise" },
    { text: "眼前是一座被金色陽光照亮的島。高山、雲海、深不見底的森林。山上的樹,真的沒有結霜。", image: "sunrise" },
    { speaker: "batu", text: "……原來是真的。", image: "sunrise" },
    { speaker: "bitu", text: "星星停在那座山的上面了。", image: "sunrise" },
    { speaker: "danum", text: "我們到了。", image: "sunrise" },
    { text: "很多很多年以後,海水漲了回來,淹沒了那條路。走過去的人留了下來,子子孫孫在南方的海岸建起了家。他們的後代裡,有一支叫作馬卡道。", image: "sunrise" },
    { text: "——第一景・跨海東來,完。", image: "sunrise" },
  ],
  battles: [B1, B2, B3],
};
