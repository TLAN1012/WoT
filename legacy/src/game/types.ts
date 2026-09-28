export type Side = 'allies' | 'enemies'
export type Terrain = 'plain' | 'forest' | 'hill' | 'marsh' | 'village' | 'water'
export type Role =
  | 'halberd'
  | 'ranger'
  | 'priest'
  | 'necromancer'
  | 'navigator'
  | 'builder'
  | 'herbalist'
  | 'cavalry'
  | 'fire_mage'
  | 'vanguard'
  | 'raider'
  | 'artillery'
  | 'commander'
export type ObjectiveType = 'eliminate' | 'hold' | 'commander'
export type AbilityKind = 'guard' | 'volley' | 'heal' | 'lunge'

export interface HexCoord {
  q: number
  r: number
}

export interface AbilityDefinition {
  name: string
  description: string
  kind: AbilityKind
  power: number
  range: number
}

export interface UnitDefinition {
  id: string
  name: string
  title: string
  role: Role
  side: Side
  maxHp: number
  attack: number
  armor: number
  move: number
  range: number
  color: number
  accent: number
  sigil: string
  ability: AbilityDefinition
}

export interface UnitState extends UnitDefinition, HexCoord {
  hp: number
  moved: boolean
  acted: boolean
  abilityUsed: boolean
  guardTurns: number
}

export interface TileDefinition extends HexCoord {
  terrain: Terrain
}

export interface EnemyPlacement extends HexCoord {
  unitId: string
}

export interface StageDefinition {
  id: string
  name: string
  chapter: string
  subtitle: string
  briefing: string
  victoryText: string
  defeatText: string
  objective: ObjectiveType
  objectiveLabel: string
  objectiveHex?: HexCoord
  objectiveTurns?: number
  roundLimit: number
  swiftRound: number
  width: number
  height: number
  allies: Array<{ unitId: string } & HexCoord>
  enemies: EnemyPlacement[]
  terrain: TileDefinition[]
  mapPosition: { x: number; y: number }
  partySize: number
  archaeologyLabel: string
  storyImage: string
}

export interface BattleResult {
  victory: boolean
  stars: number
  rounds: number
  fallenAllies: number
  stageId: string
}

export interface CampaignProgress {
  unlockedStage: number
  stars: Record<string, number>
}
