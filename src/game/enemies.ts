/**
 * 冰河時期的野獸與寒祟。
 * 牠們參考了澎湖水道打撈出的更新世動物化石(斑鬣狗、古菱齒象、老虎等),
 * 並以奇幻手法詮釋;「寒祟」是冰河的寒氣附身在生靈上的妖異。
 */
import type { EnemyDef } from "./types";

export const ENEMIES: EnemyDef[] = [
  { id: "hyena", ctype: "beast", name: "斑鬣狗", desc: "成群狩獵的冰河鬣狗。落單時膽小,圍住一個目標時最兇狠(每多一隻同伴相鄰,傷害 +20%)。", hp: 46, atk: 14, mag: 0, def: 4, mdef: 2, move: 4, skills: ["bite"], xp: 25, pack: true },
  { id: "grayfang", ctype: "beast", name: "灰牙", desc: "鬣狗群的首領,肩上帶著舊傷疤。會長嚎號令全群,讓鬣狗更加兇猛。", hp: 150, atk: 17, mag: 0, def: 8, mdef: 4, move: 4, skills: ["bite", "howl"], xp: 100, boss: true, pack: true },
  { id: "tiger", ctype: "beast", name: "雪紋虎", desc: "沉默的獨行獵者。會從兩三格外一躍撲殺,最喜歡挑落單、體弱的獵物。", hp: 100, atk: 19, mag: 0, def: 6, mdef: 4, move: 4, skills: ["bite", "pounce"], xp: 60 },
  { id: "wisp", ctype: "spirit", name: "寒祟", desc: "冰晶與黑色觸手糾纏成的小妖靈,吐出的寒氣會讓人行動遲緩。怕火,不敢踏進營火。", hp: 28, atk: 0, mag: 12, def: 2, mdef: 7, move: 3, skills: ["chill"], xp: 15, frost: true },
  { id: "elephant", ctype: "giant", name: "古象神", desc: "被寒祟附身的古菱齒象神,痛苦得失去了理智。把牠打倒,就能淨化附在身上的寒祟。", hp: 560, atk: 27, mag: 20, def: 12, mdef: 12, move: 2, skills: ["tusk", "stomp", "frostbreath", "spawn"], xp: 200, boss: true, frost: true, purify: true },
  // ── 第二景:台灣的動物 ──
  { id: "leopard", ctype: "beast", name: "雲豹", desc: "身上有雲朵般斑紋的獵者,在森林裡來去無聲(闊葉林移動不減速),會從兩三格外撲殺。", hp: 78, atk: 19, mag: 0, def: 6, mdef: 5, move: 5, skills: ["bite", "pounce"], xp: 55, forestWalker: true },
  { id: "boar", ctype: "beast", name: "山豬", desc: "被海漲逼上山的山豬。會低頭直線衝撞,把人撞退。", hp: 60, atk: 16, mag: 0, def: 7, mdef: 3, move: 4, skills: ["bite", "ram"], xp: 35 },
  { id: "macaque", ctype: "beast", name: "台灣獼猴", desc: "柴山洞穴裡的猴群。自己不太能打,但會從遠處丟石子,還會一擁而上。", hp: 34, atk: 11, mag: 0, def: 3, mdef: 4, move: 5, skills: ["stone"], xp: 18, pack: true },
  { id: "bear", ctype: "giant", name: "台灣黑熊", desc: "洞穴的主人,胸前有白色的月牙紋。熊掌一拍能把人拍暈。", hp: 290, atk: 25, mag: 0, def: 12, mdef: 8, move: 3, skills: ["maul", "stomp"], xp: 120, boss: true },
  { id: "boargod", ctype: "giant", name: "山豬神", desc: "巨大的白色山豬神。海水淹沒了牠們的平原,憤怒與悲傷讓牠失去理智。讓牠平靜下來(把生命打到 0),就能和牠立約。", hp: 640, atk: 28, mag: 0, def: 12, mdef: 10, move: 3, skills: ["ram", "stomp", "rally"], xp: 220, boss: true, purify: true },
  // ── 間章:冰河末期的台灣(左鎮菜寮溪出土過早坂犀牛、豐玉姬鱷的化石) ──
  { id: "rhino", ctype: "giant", name: "早坂犀牛", desc: "鼻上兩支角的巨大犀牛,會低頭直線衝撞。厚皮很耐打,怕法術(靈)。", hp: 150, atk: 21, mag: 0, def: 13, mdef: 5, move: 3, skills: ["bite", "ram"], xp: 70 },
  { id: "croc", ctype: "beast", name: "古鱷", desc: "潛在水潭裡的巨鱷,在淺灘與沼澤裡游得很快。咬住就不放。", hp: 110, atk: 20, mag: 0, def: 9, mdef: 4, move: 3, skills: ["bite"], xp: 55, swimmer: true },
  // ── 中段:敵對氏族(約七千～四千年前) ──
  { id: "raider", ctype: "axe", name: "氏族斧手", desc: "敵對氏族的前鋒,舉著石斧往前衝。「斧」剋野獸,但怕巨大的藤盾與卡西的熊。", hp: 62, atk: 17, mag: 0, def: 6, mdef: 4, move: 4, skills: ["axe"], xp: 30 },
  { id: "archer", ctype: "bow", name: "氏族弓手", desc: "躲在後面放箭的弓手,專打施法的人。", hp: 46, atk: 16, mag: 0, def: 4, mdef: 4, move: 3, skills: ["arrow"], xp: 28 },
  { id: "shield", ctype: "giant", name: "藤盾兵", desc: "舉著巨大藤盾的壯漢,很難打穿。怕法術(靈)。", hp: 95, atk: 13, mag: 0, def: 15, mdef: 5, move: 3, skills: ["jab"], xp: 35 },
  { id: "slinger", ctype: "bow", name: "投石手", desc: "甩著投石索的少年,1~3 格都打得到。", hp: 40, atk: 13, mag: 0, def: 3, mdef: 3, move: 4, skills: ["sling"], xp: 22 },
  { id: "shaman", ctype: "spirit", name: "氏族巫師", desc: "戴著木雕面具的巫師,會治療同伴、下詛咒。怕弓。", hp: 52, atk: 0, mag: 16, def: 4, mdef: 10, move: 3, skills: ["hex", "mend"], xp: 32 },
  { id: "chief", ctype: "axe", name: "氏族首領", desc: "頭戴獠牙羽冠的首領。會發出戰吼讓全族更兇猛。怕巨大的對手。", hp: 250, atk: 24, mag: 0, def: 11, mdef: 8, move: 4, skills: ["spear", "warcry"], xp: 150, boss: true },
  // 召喚物(我方)
  { id: "totem", name: "靈木圖騰", desc: "達努立起的圖騰。每回合治療相鄰的同伴,相鄰同伴承傷 −20%。", hp: 24, atk: 0, mag: 0, def: 6, mdef: 6, move: 0, skills: [], xp: 0, immobile: true, aura: { heal: 8, guard: true } },
  { id: "spirit-deer", ctype: "spirit", name: "靈鹿", desc: "布蘭請來的山林之靈。回合結束時會自己衝向最近的野獸。", hp: 34, atk: 16, mag: 0, def: 5, mdef: 8, move: 4, skills: ["gore"], xp: 0 },
];

const byId = new Map(ENEMIES.map((e) => [e.id, e]));
export function getEnemy(id: string): EnemyDef {
  const e = byId.get(id);
  if (!e) throw new Error(`Unknown enemy: ${id}`);
  return e;
}
