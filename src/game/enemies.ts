/**
 * 冰河時期的野獸與寒祟。
 * 牠們參考了澎湖水道打撈出的更新世動物化石(斑鬣狗、古菱齒象、老虎等),
 * 並以奇幻手法詮釋;「寒祟」是冰河的寒氣附身在生靈上的妖異。
 */
import type { EnemyDef } from "./types";

export const ENEMIES: EnemyDef[] = [
  { id: "hyena", name: "斑鬣狗", desc: "成群狩獵的冰河鬣狗。落單時膽小,圍住一個目標時最兇狠(每多一隻同伴相鄰,傷害 +20%)。", hp: 38, atk: 13, mag: 0, def: 4, mdef: 2, move: 4, skills: ["bite"], xp: 25, pack: true },
  { id: "grayfang", name: "灰牙", desc: "鬣狗群的首領,肩上帶著舊傷疤。會長嚎號令全群,讓鬣狗更加兇猛。", hp: 130, atk: 16, mag: 0, def: 8, mdef: 4, move: 4, skills: ["bite", "howl"], xp: 100, boss: true, pack: true },
  { id: "tiger", name: "雪紋虎", desc: "沉默的獨行獵者。會從兩三格外一躍撲殺,最喜歡挑落單、體弱的獵物。", hp: 85, atk: 18, mag: 0, def: 6, mdef: 4, move: 4, skills: ["bite", "pounce"], xp: 60 },
  { id: "wisp", name: "寒祟", desc: "冰晶與黑色觸手糾纏成的小妖靈,吐出的寒氣會讓人行動遲緩。怕火,不敢踏進營火。", hp: 24, atk: 0, mag: 11, def: 2, mdef: 7, move: 3, skills: ["chill"], xp: 15, frost: true },
  { id: "elephant", name: "古象神", desc: "被寒祟附身的古菱齒象神,痛苦得失去了理智。把牠打倒,就能淨化附在身上的寒祟。", hp: 400, atk: 26, mag: 19, def: 12, mdef: 10, move: 2, skills: ["tusk", "stomp", "frostbreath", "spawn"], xp: 200, boss: true, frost: true, purify: true },
  // 召喚物(我方)
  { id: "totem", name: "靈木圖騰", desc: "達努立起的圖騰。每回合治療相鄰的同伴,相鄰同伴承傷 −20%。", hp: 24, atk: 0, mag: 0, def: 6, mdef: 6, move: 0, skills: [], xp: 0, immobile: true, aura: { heal: 8, guard: true } },
];

const byId = new Map(ENEMIES.map((e) => [e.id, e]));
export function getEnemy(id: string): EnemyDef {
  const e = byId.get(id);
  if (!e) throw new Error(`Unknown enemy: ${id}`);
  return e;
}
