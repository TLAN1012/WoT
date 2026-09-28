/**
 * 間章・南島初行 — 第一景與第二景之間的試煉(可以一直回來玩)
 *
 * 六人抵達台灣之後,在冰河末期的西南平原四處探索。每次四人上陣。
 * 每一關可選 1★~3★:星越高敵人越強、掉越好的材料(燧石、貝殼、鹿角、黑曜石),用來升級信物;
 * 經驗值只有平常的 1/10。打過 1★ 才能挑戰下一關與 2★,打過 2★ 才能挑戰 3★。
 *
 * 台南左鎮菜寮溪出土過早坂犀牛、古菱齒象、豐玉姬鱷等化石;故事與地名是奇幻詮釋。
 * 地圖由 mapgen.ts 依主題與固定種子產生。
 */
import type { BattleDef, ChapterDef, MaterialId, Objective, Placement } from "../types";
import { generateMap, type Theme } from "./mapgen";

interface StageSpec {
  id: string;
  title: string;
  subtitle: string;
  theme: Theme;
  seed: number;
  art: string;
  material: MaterialId;
  /** 敵人 defId(依地圖的東側候選格依序擺放);第一個是 "!" 開頭表示首領 */
  foes: string[];
  /** 2★ 多一隻、3★ 再多兩隻 */
  extra: string[];
  objective?: "rout" | "survive" | "reach" | "boss";
  turns?: number;
  waves?: Array<{ turn: number; text: string; foes: string[] }>;
  intro: string;
  outro: string;
  music: BattleDef["music"];
}

const STAGES: StageSpec[] = [
  { id: "i01", title: "西岸沙洲", subtitle: "剛上岸的海邊", theme: "coast", seed: 101, art: "coast", material: "shell", foes: ["hyena", "hyena", "hyena", "hyena"], extra: ["hyena", "tiger", "hyena"], intro: "上岸的第一個早晨。沙洲上的腳印告訴大家:這裡也有鬣狗。", outro: "沙洲安全了。貝殼在浪裡閃閃發亮。", music: { slot: "battle", variant: "a" } },
  { id: "i02", title: "鹿群草原", subtitle: "水鹿成群的平原", theme: "grass", seed: 202, art: "i-grass", material: "flint", foes: ["tiger", "hyena", "hyena"], extra: ["hyena", "leopard", "hyena"], intro: "草原上的水鹿成群低頭吃草。可是草叢裡,有別的眼睛也在看著牠們。", outro: "鹿群安心地跑遠了。草叢裡有一堆好用的燧石。", music: { slot: "battle", variant: "a" } },
  { id: "i03", title: "犀牛溪", subtitle: "卵石河灘", theme: "river", seed: 303, art: "i-river", material: "flint", foes: ["rhino", "boar", "boar"], extra: ["boar", "rhino", "boar"], intro: "溪邊有一頭巨大的犀牛在喝水。牠抬起頭,鼻上的兩支角對準了大家。", outro: "犀牛慢慢走回了溪的上游。河灘上滿是敲得開的燧石。", music: { slot: "battle", variant: "b" } },
  { id: "i04", title: "鱷魚潭", subtitle: "霧氣瀰漫的沼澤", theme: "lagoon", seed: 404, art: "i-marsh", material: "shell", foes: ["croc", "croc", "wisp"], extra: ["croc", "wisp", "croc"], intro: "蘆葦叢裡只露出一雙眼睛。卡西小聲說:「不要靠近水邊。」", outro: "鱷魚沉回了潭底。潭邊的泥裡埋著好多貝殼。", music: { slot: "battle", variant: "b" } },
  { id: "i05", title: "猴群峭壁", subtitle: "石灰岩的崖壁", theme: "hill", seed: 505, art: "chaishan", material: "antler", foes: ["macaque", "macaque", "macaque", "macaque", "leopard"], extra: ["macaque", "macaque", "leopard"], intro: "崖壁上的猴群尖叫著丟石頭。牠們守著一堆水鹿脫下的鹿角。", outro: "猴群一哄而散,留下一地的鹿角。", music: { slot: "battle", variant: "a" } },
  { id: "i06", title: "古象之森", subtitle: "巨木與獸徑", theme: "forest", seed: 606, art: "i-grass", material: "antler", foes: ["boar", "boar", "rhino", "boar"], extra: ["boar", "rhino", "boar"], objective: "reach", intro: "森林裡傳來轟隆聲——獸群在奔逃。穿過森林,到東邊的空地去!", outro: "大家穿出了森林。回頭看,獸群的腳印把地面踩成了一條路。", music: { slot: "battle", variant: "b" } },
  { id: "i07", title: "豹影林", subtitle: "斑駁的林間", theme: "forest", seed: 707, art: "i-grass", material: "antler", foes: ["leopard", "leopard", "leopard", "macaque"], extra: ["leopard", "macaque", "leopard"], intro: "樹影裡有雲朵般的斑紋一閃而過。瑪塔拉滿了弓:「三隻……不,四隻。」", outro: "雲豹們退進了更深的林子。", music: { slot: "battle", variant: "a" } },
  { id: "i08", title: "熊穴", subtitle: "山腳的岩洞", theme: "hill", seed: 808, art: "chaishan", material: "flint", foes: ["!bear", "boar", "boar"], extra: ["boar", "leopard", "boar"], objective: "boss", intro: "暴雨要來了,山腳下有個乾燥的岩洞。可是洞口有很大的腳印。", outro: "黑熊讓出了岩洞。大家在洞裡躲過了一場大雨。", music: { slot: "boss", variant: "b" } },
  { id: "i09", title: "殘雪之峰", subtitle: "還沒融化的高山雪原", theme: "snow", seed: 909, art: "i-snow", material: "antler", foes: ["wisp", "wisp", "wisp", "wisp"], extra: ["wisp", "wisp", "wisp"], objective: "survive", turns: 6, waves: [{ turn: 3, text: "寒霧裡又冒出寒祟!", foes: ["wisp", "wisp"] }], intro: "山頂的殘雪裡還有寒祟。達努說:「撐到太陽出來,牠們就會散了。」", outro: "陽光照上雪原,寒祟化成了霧。", music: { slot: "boss", variant: "a" } },
  { id: "i10", title: "南岬", subtitle: "最南端的珊瑚礁海岸", theme: "cape", seed: 1010, art: "sunrise", material: "shell", foes: ["croc", "tiger", "hyena", "hyena"], extra: ["hyena", "croc", "tiger"], intro: "走到了陸地的盡頭。珊瑚礁上的風好大,浪裡還有鱷魚。", outro: "大家坐在岬角上,看著三面都是海。", music: { slot: "battle", variant: "a" } },
  { id: "i11", title: "大河口", subtitle: "河水與海水交會的地方", theme: "river", seed: 1111, art: "i-river", material: "flint", foes: ["rhino", "boar", "boar"], extra: ["boar", "rhino", "croc"], objective: "survive", turns: 7, waves: [{ turn: 3, text: "上游又衝下來一群山豬!", foes: ["boar", "boar"] }, { turn: 5, text: "犀牛也被驚動了!", foes: ["rhino"] }], intro: "大河口的沙洲上可以過夜——前提是撐過今晚的獸群。", outro: "天亮了,河口的霧慢慢散去。", music: { slot: "battle", variant: "b" } },
  { id: "i12", title: "星落之丘", subtitle: "比杜說星星落在這裡", theme: "grass", seed: 1212, art: "i-snow", material: "obsidian", foes: ["!grayfang", "hyena", "hyena", "tiger"], extra: ["hyena", "hyena", "tiger"], objective: "boss", intro: "比杜一直說,有一顆星星落在這座山丘上。可是山丘上等著大家的,是一道熟悉的舊傷疤——灰牙,追過海來了。", outro: "灰牙終於轉身離去。山丘上散落著漆黑發亮的石頭——黑曜石,像落下來的星星。", music: { slot: "boss", variant: "a" } },
];

function toBattle(sp: StageSpec, index: number): BattleDef {
  const map = generateMap(sp.theme, sp.seed);
  const spots = [...map.spots];
  let n = 0;
  const place = (defId: string): Placement => {
    const boss = defId.startsWith("!");
    const id = boss ? defId.slice(1) : defId;
    const cell = spots.shift() ?? map.goal[0];
    return { id: boss ? id : `${sp.id}-${id}-${n++}`, defId: id, cell };
  };
  const enemies = sp.foes.map(place);
  const boss = enemies.find((_, i) => sp.foes[i].startsWith("!"));
  const extras2 = [place(sp.extra[0])];
  const extras3 = sp.extra.slice(1).map(place);
  const waves = (sp.waves ?? []).map((w) => ({ turn: w.turn, text: w.text, units: w.foes.map(place) }));
  let objective: Objective = { kind: "rout" };
  let objectiveText = "擊退所有野獸";
  if (sp.objective === "survive") {
    objective = { kind: "survive", turns: sp.turns ?? 6 };
    objectiveText = `撐過 ${sp.turns} 回合`;
  } else if (sp.objective === "reach") {
    objective = { kind: "reach", cells: map.goal };
    objectiveText = "讓所有人抵達東邊的空地";
  } else if (sp.objective === "boss" && boss) {
    objective = { kind: "purify", unitId: boss.id };
    objectiveText = "擊退首領";
  }
  return {
    id: sp.id,
    title: `${index + 1}. ${sp.title}`,
    subtitle: sp.subtitle,
    art: sp.art,
    objective,
    objectiveText,
    parTurns: 8,
    map: map.rows,
    heroes: [
      { heroId: "batu", cell: map.heroes[0] },
      { heroId: "danum", cell: map.heroes[1] },
      { heroId: "bitu", cell: map.heroes[2] },
      { heroId: "mata", cell: map.heroes[3] },
    ],
    deploy: map.deploy,
    maxHeroes: 4,
    enemies,
    waves,
    tierExtras: { 2: extras2, 3: extras3 },
    xpScale: 0.1,
    enemyScale: 1 + index * 0.05,
    material: sp.material,
    shards: { first: {}, replay: ["mata", "kasiw", "bulan"] },
    reward: "",
    winArt: "win-inter",
    music: sp.music,
    intro: [{ text: sp.intro }],
    outro: [{ text: sp.outro }],
    defeat: [{ text: "先退回營地休息。換一組人、換個站位,或是先挑低一點的星數吧。" }],
    // 地圖節點:沿著古地圖由北往南蜿蜒
    node: { x: 18 + ((index % 4) * 21) + (Math.floor(index / 4) % 2 ? 8 : 0), y: 20 + Math.floor(index / 4) * 30 },
  };
}

export const INTERLUDE: ChapterDef = {
  id: "inter1",
  generation: 1,
  requires: "ch1",
  mode: "trial",
  title: "間章・南島初行",
  subtitle: "六個人,在剛抵達的南方大地上四處探索",
  era: "冰河末期・抵達台灣之後",
  mapArt: "i-map",
  intro: [
    { text: "三個孩子走過了海。沿著記號追來的同伴,一個一個加入。", image: "i-grass" },
    { text: "眼前的大地好大:草原、河流、沼澤、森林,一直延伸到最南端的岬角。", image: "i-grass" },
    { text: "【間章・試煉】一共十二處,每次四人上陣。每一處可以選 1★~3★:星越高野獸越強,但掉的材料越好。經驗只有平常的十分之一——這裡是收集材料、升級信物的地方。", image: "i-grass" },
  ],
  epilogue: [],
  battles: STAGES.map(toBattle),
};
