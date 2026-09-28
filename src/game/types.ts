/**
 * 型別總表 — 英雄 RPG 戰棋
 *
 * 一格一位英雄(不是部隊)。英雄有五項屬性、職業、等級與技能;
 * 每回合每位英雄可以「移動一次 + 行動一次」(攻擊、施放技能或待命)。
 */
import type { Hex } from "../engine/hex";

export type Cell = [col: number, row: number];

// ── 屬性與職業 ────────────────────────────────────────
export type AttrId = "str" | "agi" | "int" | "spi" | "vit";
export type Attrs = Record<AttrId, number>;

/** 六大職業系(族語命名,見 classes.ts) */
export type FamilyId = "kapah" | "inibs" | "vukid" | "rikat" | "hanitu" | "hanup";
/** 怒氣:受傷與出手累積;靈力:每回合回復 */
export type ResourceId = "rage" | "mana";

export interface FamilyDef {
  id: FamilyId;
  /** 族語名 */
  name: string;
  /** 中文系名 */
  zh: string;
  /** 語源說明 */
  etymology: string;
  resource: ResourceId;
  ctype: CombatType;
  color: string;
  desc: string;
  /** 被動特性 */
  passive: { name: string; desc: string };
}

export interface ClassDef {
  id: string;
  family: FamilyId;
  name: string;
  move: number;
  /** 一級時的基礎屬性 */
  base: Attrs;
  /** 每升一級自動成長 */
  growth: Partial<Attrs>;
  /** 天生護甲(物理減傷) */
  armor: number;
  basic: string;
  /** 依等級習得的技能 */
  skills: Array<{ level: number; skill: string }>;
}

// ── 技能 ──────────────────────────────────────────────
export type SkillShape = "single" | "cleave" | "ring" | "line" | "blast" | "chain" | "dash";
export type SkillTarget = "enemy" | "ally" | "self" | "empty";
export type SkillEffect = "damage" | "heal" | "summon" | "buff" | "drain" | "cleanse";
export type StatusId = "stun" | "slow" | "might" | "guard" | "taunt" | "regen" | "mark" | "root" | "bear";

/** 戰型:斧 → 獸 → 弓 → 靈 → 巨 → 斧(每一型剋下一型) */
export type CombatType = "axe" | "beast" | "bow" | "spirit" | "giant";

export interface StatusApply {
  id: StatusId;
  turns: number;
  /** regen 的回復量等 */
  value?: number;
}

export interface SkillDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  /** 消耗(怒氣或靈力;野獸不看) */
  cost: number;
  /** 冷卻回合數(施放後要等幾個自己的回合) */
  cooldown: number;
  target: SkillTarget;
  range: [min: number, max: number];
  shape: SkillShape;
  /** blast 半徑 / line 長度 / chain 跳數 */
  size?: number;
  effect: SkillEffect;
  /** 依哪項能力值計算威力 */
  scale: "phys" | "magic" | "heal";
  power: number;
  statuses?: StatusApply[];
  /** 對自己施加的狀態(戰吼等) */
  selfStatuses?: StatusApply[];
  knockback?: number;
  summon?: string;
}

// ── 地形 ──────────────────────────────────────────────
export interface TerrainDef {
  id: string;
  name: string;
  char: string;
  moveCost: number;
  /** 承傷修正(正 = 減傷) */
  defense: number;
  impassable?: boolean;
  /** 站在這裡時遠程技能射程 +1 */
  highGround?: boolean;
  /** 回合開始時回復最大生命的比例 */
  heal?: number;
  /** 寒祟無法進入 */
  warding?: boolean;
  color: string;
  desc: string;
}

// ── 角色 ──────────────────────────────────────────────
export interface HeroDef {
  id: string;
  name: string;
  /** 名字的由來 */
  roman: string;
  etymology: string;
  title: string;
  classId: string;
  /** 立繪臉朝向:朝右的擺在左邊、朝左的擺在右邊 */
  facing: "left" | "right";
  bio: string;
  /** 各代承名者的介紹(祖名傳承) */
  heirBios?: Record<number, string>;
  /** 需要招募的英雄:足跡(碎片)名稱與加入時的劇情 */
  recruit?: { shard: string; need: number; story: StoryPage[] };
}

export interface EnemyDef {
  id: string;
  name: string;
  desc: string;
  ctype?: CombatType;
  hp: number;
  atk: number;
  mag: number;
  def: number;
  mdef: number;
  move: number;
  skills: string[];
  xp: number;
  boss?: boolean;
  /** 寒祟類:不能踏進營火 */
  frost?: boolean;
  /** 同伴包圍加成(鬣狗) */
  pack?: boolean;
  /** 不會移動(圖騰) */
  immobile?: boolean;
  /** 闊葉林/針葉林移動不減速(雲豹) */
  forestWalker?: boolean;
  /** 被擊倒時是「淨化」而不是死亡 */
  purify?: boolean;
  /** 圖騰:每回合開始時治療周圍友軍 */
  aura?: { heal: number; guard?: boolean };
}

/** 劇情裡可以說話的人(英雄與野獸神) */
export interface SpeakerDef {
  id: string;
  name: string;
  title: string;
  facing: "left" | "right";
}

export interface Status {
  id: StatusId;
  turns: number;
  value?: number;
  /** 挑釁來源 */
  source?: string;
}

export type Side = "hero" | "enemy";

export interface Unit {
  id: string;
  side: Side;
  /** 英雄 id 或敵人/召喚物 id */
  defId: string;
  name: string;
  isHero: boolean;
  pos: Hex;
  level: number;
  maxHp: number;
  hp: number;
  resource: ResourceId | null;
  maxRes: number;
  res: number;
  /** 靈力每回合回復 */
  resRegen: number;
  atk: number;
  mag: number;
  heal: number;
  def: number;
  mdef: number;
  /** 暴擊率 0~1 */
  crit: number;
  move: number;
  skills: string[];
  cooldowns: Record<string, number>;
  statuses: Status[];
  moved: boolean;
  acted: boolean;
  /** 召喚物剩餘回合 */
  lifetime?: number;
  xpValue: number;
  /** 倒下(英雄)/淨化(神獸) */
  down?: boolean;
  ctype?: CombatType;
  /** 配戴信物的效果;每場一次的用過會記在 charmUsed */
  charms: CharmEffect[];
  charmUsed: CharmEffect[];
}

// ── 信物 ──────────────────────────────────────────────
export type SlotId = "brow" | "chest" | "navel";
export type CharmEffect =
  | "sureCrit"
  | "dodgeOnce"
  | "reviveOnce"
  | "freeCastOnce"
  | "openGuard"
  | "regen5"
  | "cdMinus"
  | "noCC"
  | "hpUp15"
  | "spellUp10"
  | "chillOnce"
  | "magicRes15"
  | "executioner"
  | "moveUp"
  | "killHeal"
  | "firstMove2"
  | "tideWalker"
  | "healAura"
  | "rangeUp"
  | "guardAlly"
  | "lastStand"
  | "firstStrike"
  | "counterBoost"
  | "resStart";

export interface KeepsakeDef {
  id: string;
  name: string;
  lore: string;
  effects: Record<SlotId, { effect: CharmEffect; desc: string }>;
}

/** 背包裡的一件信物(同一種可以有好幾件) */
export interface KeepsakeItem {
  uid: string;
  id: string;
}

// ── 關卡 ──────────────────────────────────────────────
export type Objective =
  | { kind: "rout" }
  | { kind: "reach"; cells: Cell[] }
  | { kind: "survive"; turns: number; orBoss?: string }
  | { kind: "purify"; unitId: string };

export interface Placement {
  id: string;
  defId: string;
  cell: Cell;
  level?: number;
}

export interface Wave {
  turn: number;
  text: string;
  units: Placement[];
}

/** 漲潮:某回合開始時,一批格子變成淺灘或海 */
export interface Tide {
  turn: number;
  text?: string;
  cells: Cell[];
  to: string;
}

export interface StoryPage {
  speaker?: string;
  text: string;
  image?: string;
}

export interface BattleDef {
  id: string;
  title: string;
  subtitle: string;
  art: string;
  objective: Objective;
  objectiveText: string;
  /** 三星的回合數門檻 */
  parTurns: number;
  map: string[];
  /** 預設站位(布陣時可以改) */
  heroes: Array<{ heroId: string; cell: Cell }>;
  /** 出發區:布陣時英雄可以放的格子 */
  deploy: Cell[];
  /** 上陣名額 */
  maxHeroes: number;
  /** 足跡:第一次勝利必得的數量;重玩時隨機掉落的英雄 */
  shards: { first: Record<string, number>; replay: string[] };
  enemies: Placement[];
  waves?: Wave[];
  tides?: Tide[];
  intro: StoryPage[];
  outro: StoryPage[];
  defeat: StoryPage[];
  /** 第一次勝利的獎勵信物 */
  reward: string;
  /** 勝利插圖 */
  winArt: string;
  /** 戰鬥配樂:段落與預設版本(玩家可在音樂室改) */
  music: { slot: "battle" | "boss"; variant: "a" | "b" };
  /** 章節地圖上的位置(%) */
  node: { x: number; y: number };
}

export interface ChapterDef {
  id: string;
  /** 第幾代(祖名傳承) */
  generation: number;
  /** 前一章全破才開放 */
  requires?: string;
  title: string;
  subtitle: string;
  era: string;
  mapArt: string;
  intro: StoryPage[];
  epilogue: StoryPage[];
  battles: BattleDef[];
}

// ── 戰鬥狀態 ──────────────────────────────────────────
export type Outcome = "ongoing" | "victory" | "defeat";

export interface LogEntry {
  turn: number;
  kind: "info" | "hit" | "heal" | "down" | "level" | "event" | "skill" | "charm" | "miss" | "drop";
  text: string;
  /** 飄字用 */
  at?: Hex;
  amount?: number;
  crit?: boolean;
  skill?: string;
}

export interface BattleState {
  battleId: string;
  /** 布陣中 / 戰鬥中 */
  phase: "deploy" | "fight";
  /** 沒上陣的英雄(布陣時可以換上) */
  reserve: Unit[];
  deploy: string[];
  maxHeroes: number;
  turn: number;
  side: Side;
  units: Unit[];
  terrain: Record<string, string>;
  objective: Objective;
  waves: Wave[];
  tides: Tide[];
  log: LogEntry[];
  outcome: Outcome;
  seed: number;
  difficulty: DifficultyId;
  /** 本場每位英雄獲得的經驗 */
  xp: Record<string, number>;
  /** 本場撿到的信物 id(勝利才帶得走) */
  drops: string[];
  nextId: number;
}

// ── 進度 ──────────────────────────────────────────────
export type DifficultyId = "gentle" | "brave" | "legend";

export interface DifficultyDef {
  id: DifficultyId;
  name: string;
  desc: string;
  enemyHp: number;
  enemyDmg: number;
  /** AI 找最佳解的機率 */
  aiSkill: number;
  allowUndo: boolean;
}

export interface HeroProgress {
  id: string;
  level: number;
  xp: number;
  /** 玩家自己分配的點數 */
  bonus: Attrs;
  unspent: number;
}

export interface SaveState {
  version: 1;
  /** 目前是第幾代(祖名傳承) */
  generation: number;
  difficulty: DifficultyId;
  party: string[];
  heroes: Record<string, HeroProgress>;
  /** 關卡 id → 最佳星數 */
  stars: Record<string, number>;
  inventory: KeepsakeItem[];
  /** 英雄 id → 撿到的足跡數 */
  shards: Record<string, number>;
  /** 英雄 → 位置 → 信物 uid */
  equipment: Record<string, Partial<Record<SlotId, string>>>;
  nextUid: number;
  seenIntro: string[];
}
