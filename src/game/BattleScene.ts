import Phaser from 'phaser'
import { audioDirector } from './audio'
import { STAGES, unitDefinition } from './data'
import { createHexField, hexDistance, hexKey, reachableHexes, shortestStep } from './hex'
import { calculateStars, recordResult } from './progress'
import { registerGeneratedFrames, terrainFrame, unitFrame } from './assets'
import type { BattleResult, HexCoord, StageDefinition, Terrain, TileDefinition, UnitState } from './types'

const UI = {
  ink: 0x0c1513,
  panel: 0x15241f,
  panelLight: 0x243a32,
  gold: 0xefc15a,
  cream: '#f7efd8',
  muted: '#a8b6aa',
  ally: 0x67c8a1,
  enemy: 0xe36f58,
}

const FONT_SANS = '"PingFang TC", "Noto Sans TC", sans-serif'
const FONT_DISPLAY = '"PingFang TC", "Noto Sans TC", serif'
const ISO_Y_SCALE = 0.55

const TERRAIN_INFO: Record<Terrain, { name: string; description: string }> = {
  plain: { name: '平原', description: '一般地形，沒有額外加成或懲罰。' },
  forest: { name: '森林', description: '提供掩護，受到的一般攻擊傷害降低 35%。' },
  hill: { name: '高地', description: '攻擊低處目標時，造成的傷害提高 25%。' },
  marsh: { name: '沼澤', description: '進入後立刻停止移動，受到的一般攻擊傷害提高 20%。' },
  village: { name: '村落', description: '新回合開始時，恢復最大生命值的 12%。' },
  water: { name: '水域', description: '地面單位無法進入。' },
}

const ROLE_LABELS: Record<UnitState['role'], string> = {
  vanguard: '前衛',
  ranger: '射手',
  mystic: '術士',
  skirmisher: '游擊兵',
  raider: '掠兵',
  artillery: '遠程兵',
  commander: '指揮官',
}

interface BattleLayout {
  width: number
  height: number
  portrait: boolean
  panelX: number
  panelY: number
  panelWidth: number
  panelHeight: number
  boardX: number
  boardY: number
  boardWidth: number
  boardHeight: number
  hexSize: number
}

export class BattleScene extends Phaser.Scene {
  private stageIndex = 0
  private stage!: StageDefinition
  private tiles: TileDefinition[] = []
  private tileMap = new Map<string, TileDefinition>()
  private units: UnitState[] = []
  private tokens = new Map<string, Phaser.GameObjects.Container>()
  private selectedId?: string
  private abilityMode = false
  private playerPhase = true
  private round = 1
  private holdProgress = 0
  private initialAllies = 0
  private finished = false
  private layout!: BattleLayout
  private highlights: Phaser.GameObjects.Polygon[] = []
  private detailObjects: Phaser.GameObjects.GameObject[] = []
  private phaseText?: Phaser.GameObjects.Text
  private objectiveText?: Phaser.GameObjects.Text
  private tooltip?: Phaser.GameObjects.Container
  private longPressTimer?: Phaser.Time.TimerEvent
  private longPressTriggered = false

  constructor() {
    super('battle')
  }

  preload(): void {
    this.load.image('allies-sheet', `${import.meta.env.BASE_URL}assets/generated/allies-sheet.png`)
    this.load.image('enemies-sheet', `${import.meta.env.BASE_URL}assets/generated/enemies-sheet.png`)
    this.load.image('terrain-sheet', `${import.meta.env.BASE_URL}assets/generated/terrain-sheet.png`)
  }

  init(data: { stageIndex: number }): void {
    this.stageIndex = data.stageIndex
    this.stage = STAGES[this.stageIndex]
    this.round = 1
    this.holdProgress = 0
    this.selectedId = undefined
    this.abilityMode = false
    this.playerPhase = true
    this.finished = false
    this.tokens.clear()
    this.highlights = []
    this.detailObjects = []
  }

  create(): void {
    this.layout = this.calculateLayout()
    registerGeneratedFrames(this.textures)
    this.tiles = createHexField(this.stage.width, this.stage.height, this.stage.terrain)
    this.tileMap = new Map(this.tiles.map((tile) => [hexKey(tile), tile]))
    this.units = this.createUnits()
    this.initialAllies = this.units.filter((unit) => unit.side === 'allies').length

    this.cameras.main.setBackgroundColor(0x101b17)
    this.drawBackdrop()
    this.drawBoard()
    this.units.forEach((unit) => this.createUnitToken(unit))
    this.drawInterface()
    this.refreshSelection()

    this.input.once('pointerdown', () => {
      void audioDirector.unlock().then(() => audioDirector.startMusic('battle'))
    })
    audioDirector.startMusic('battle')
  }

  private calculateLayout(): BattleLayout {
    const width = this.scale.width
    const height = this.scale.height
    const portrait = width < 720
    const top = portrait ? 126 : 94
    const panelWidth = portrait ? width - 20 : Math.min(330, width * 0.27)
    const panelHeight = portrait ? Math.min(210, height * 0.27) : height - top - 12
    const panelX = portrait ? 10 : width - panelWidth - 10
    const panelY = portrait ? height - panelHeight - 10 : top
    const boardX = portrait ? 10 : 16
    const boardY = top
    const boardWidth = portrait ? width - 20 : panelX - 26
    const boardHeight = portrait ? panelY - top - 10 : height - top - 14
    const sizeByWidth = boardWidth / (Math.sqrt(3) * (this.stage.width + this.stage.height / 2 + 0.2))
    const sizeByHeight = boardHeight / (1.5 * ISO_Y_SCALE * Math.max(1, this.stage.height - 1) + 2.7)
    const hexSize = Math.max(19, Math.min(48, sizeByWidth, sizeByHeight))

    return { width, height, portrait, panelX, panelY, panelWidth, panelHeight, boardX, boardY, boardWidth, boardHeight, hexSize }
  }

  private createUnits(): UnitState[] {
    const allies = this.stage.allies.map((placement) => {
      const definition = unitDefinition(placement.unitId)
      return { ...definition, ...placement, hp: definition.maxHp, moved: false, acted: false, abilityUsed: false, guardTurns: 0 }
    })
    const enemies = this.stage.enemies.map((placement, index) => {
      const definition = unitDefinition(placement.unitId)
      return {
        ...definition,
        ...placement,
        id: `${definition.id}-${index}`,
        hp: definition.maxHp,
        moved: false,
        acted: false,
        abilityUsed: false,
        guardTurns: 0,
      }
    })
    return [...allies, ...enemies]
  }

  private drawBackdrop(): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x10251f, 1)
    graphics.fillRect(0, 0, this.layout.width, this.layout.height)
    graphics.fillStyle(0x1d3830, 0.75)
    graphics.fillEllipse(this.layout.boardX + this.layout.boardWidth * 0.45, this.layout.boardY + this.layout.boardHeight * 0.52, this.layout.boardWidth * 1.08, this.layout.boardHeight * 1.03)
    for (let i = 0; i < 20; i += 1) {
      graphics.lineStyle(1, 0x9ac2aa, 0.06)
      graphics.lineBetween(0, 110 + i * 31, this.layout.width, 90 + i * 31)
    }
  }

  private drawBoard(): void {
    for (const tile of this.tiles) {
      const center = this.hexCenter(tile)
      this.add.image(center.x, center.y - this.layout.hexSize * 0.55, 'terrain-sheet', terrainFrame(tile.terrain))
        .setDisplaySize(this.layout.hexSize * 2.35, this.layout.hexSize * 2.35)
        .setDepth(1 + center.y / 10_000)
      const hitWidth = Math.sqrt(3) * this.layout.hexSize
      const hitHeight = this.layout.hexSize * 2 * ISO_Y_SCALE
      const hitPoints = this.hexPoints(this.layout.hexSize).map((value, index) => value + (index % 2 === 0 ? hitWidth / 2 : hitHeight / 2))
      const hitZone = this.add.zone(center.x, center.y, hitWidth, hitHeight)
        .setDepth(4)
        .setInteractive(new Phaser.Geom.Polygon(hitPoints), Phaser.Geom.Polygon.Contains)
      if (hitZone.input) hitZone.input.cursor = tile.terrain === 'water' ? 'help' : 'pointer'
      this.bindTileInteraction(hitZone, tile)
    }

    if (this.stage.objectiveHex) {
      const center = this.hexCenter(this.stage.objectiveHex)
      this.add.ellipse(center.x, center.y, this.layout.hexSize * 0.95, this.layout.hexSize * 0.38, UI.gold, 0.18)
        .setStrokeStyle(3, UI.gold, 0.9)
        .setDepth(3.5)
      this.add.ellipse(center.x, center.y, this.layout.hexSize * 0.34, this.layout.hexSize * 0.14, UI.gold, 0.82).setDepth(3.6)
      this.tweens.add({ targets: this.add.ellipse(center.x, center.y, this.layout.hexSize, this.layout.hexSize * 0.4, UI.gold, 0.1).setDepth(3.5), scale: 1.35, alpha: 0, duration: 1200, repeat: -1 })
    }
  }

  private createUnitToken(unit: UnitState): void {
    const center = this.hexCenter(unit)
    const s = this.layout.hexSize
    const token = this.add.container(center.x, center.y)
    const shadow = this.add.ellipse(2, s * 0.18, s * 1.02, s * 0.3, 0x07100d, 0.52)
    const ring = this.add.ellipse(0, s * 0.12, s * 1.15, s * 0.4, unit.side === 'allies' ? UI.ally : UI.enemy, 0.34)
      .setStrokeStyle(3, unit.accent, 0.95)
    const miniature = this.add.image(0, -s * 0.52, unit.side === 'allies' ? 'allies-sheet' : 'enemies-sheet', unitFrame(unit.id))
      .setDisplaySize(s * 1.78, s * 1.78)
    const hpBg = this.add.rectangle(-s * 0.48, s * 0.43, s * 0.96, 6, 0x08110e, 0.92).setOrigin(0).setName('hp-bg')
    const hpFill = this.add.rectangle(-s * 0.48, s * 0.43, s * 0.96, 6, unit.side === 'allies' ? UI.ally : UI.enemy, 1).setOrigin(0).setName('hp-fill')
    token.add([shadow, ring, miniature, hpBg, hpFill])
      .setSize(s * 1.4, s * 1.95)
      .setDepth(5 + center.y / 10_000)
      .setInteractive({ useHandCursor: true })
    token.on('pointerover', (pointer: Phaser.Input.Pointer) => this.showUnitTooltip(unit, pointer))
    token.on('pointermove', (pointer: Phaser.Input.Pointer) => this.positionTooltip(pointer))
    token.on('pointerout', () => {
      this.cancelLongPress()
      this.hideTooltip()
    })
    token.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.longPressTriggered = false
      this.startLongPress(() => this.showUnitTooltip(unit, pointer))
    })
    token.on('pointerup', () => {
      const wasLongPress = this.longPressTriggered
      this.cancelLongPress()
      this.longPressTriggered = false
      if (!wasLongPress) {
        this.hideTooltip()
        this.handleUnitClick(unit)
      } else {
        this.time.delayedCall(1600, () => this.hideTooltip())
      }
    })
    token.on('pointerupoutside', () => {
      this.cancelLongPress()
      this.longPressTriggered = false
    })
    this.tokens.set(unit.id, token)
  }

  private drawInterface(): void {
    const { width, panelX, panelY, panelWidth, panelHeight, portrait } = this.layout
    this.add.rectangle(0, 0, width, portrait ? 116 : 84, UI.ink, 0.96).setOrigin(0).setDepth(10)
    this.add.text(18, 12, `第 ${this.stage.chapter} 章 · ${this.stage.name}`, {
      fontFamily: FONT_DISPLAY,
      fontSize: portrait ? '21px' : '26px',
      fontStyle: 'bold',
      color: UI.cream,
    }).setDepth(11)
    this.objectiveText = this.add.text(20, portrait ? 59 : 50, this.objectiveStatus(), {
      fontFamily: FONT_SANS, fontSize: portrait ? '12px' : '13px', color: '#b9c8bd',
      wordWrap: { width: portrait ? width - 32 : Math.max(250, width * 0.5), useAdvancedWrap: true },
    }).setDepth(11)
    this.phaseText = this.add.text(portrait ? 20 : width - 18, portrait ? 42 : 16, '第 1 回合 · 我方行動', {
      fontFamily: FONT_SANS, fontSize: portrait ? '12px' : '14px', fontStyle: 'bold', color: '#efc15a',
    }).setOrigin(portrait ? 0 : 1, 0).setDepth(11)

    this.add.rectangle(panelX, panelY, panelWidth, panelHeight, UI.panel, 0.97)
      .setOrigin(0)
      .setStrokeStyle(1, 0x7a9184, 0.4)
      .setDepth(8)

    const buttonWidth = portrait ? Math.min(124, (width - 40) / 3) : panelWidth - 28
    const actionsY = portrait ? 80 : panelY + panelHeight - 112
    const actionsX = portrait ? 10 : panelX + 14
    this.createButton(actionsX, actionsY, buttonWidth, 36, '結束回合', () => this.endPlayerTurn(), 13)
    this.createButton(
      portrait ? actionsX + buttonWidth + 8 : actionsX,
      portrait ? actionsY : actionsY + 43,
      buttonWidth,
      34,
      '撤退',
      () => this.finishBattle(false),
      13,
      true,
    )
    if (portrait) {
      this.createButton(actionsX + (buttonWidth + 8) * 2, actionsY, buttonWidth, 36, audioDirector.isMuted() ? '音效關' : '音效開', () => {
        audioDirector.setMuted(!audioDirector.isMuted())
      }, 12, true)
    }
  }

  private bindTileInteraction(zone: Phaser.GameObjects.Zone, tile: TileDefinition): void {
    zone.on('pointerover', (pointer: Phaser.Input.Pointer) => this.showTerrainTooltip(tile, pointer))
    zone.on('pointermove', (pointer: Phaser.Input.Pointer) => this.positionTooltip(pointer))
    zone.on('pointerout', () => {
      this.cancelLongPress()
      this.hideTooltip()
    })
    zone.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.longPressTriggered = false
      this.startLongPress(() => this.showTerrainTooltip(tile, pointer))
    })
    zone.on('pointerup', () => {
      const wasLongPress = this.longPressTriggered
      this.cancelLongPress()
      this.longPressTriggered = false
      if (!wasLongPress) {
        this.hideTooltip()
        this.handleTileClick(tile)
      } else {
        this.time.delayedCall(1600, () => this.hideTooltip())
      }
    })
    zone.on('pointerupoutside', () => {
      this.cancelLongPress()
      this.longPressTriggered = false
    })
  }

  private startLongPress(action: () => void): void {
    this.cancelLongPress()
    this.longPressTimer = this.time.delayedCall(460, () => {
      this.longPressTriggered = true
      action()
    })
  }

  private cancelLongPress(): void {
    this.longPressTimer?.remove(false)
    this.longPressTimer = undefined
  }

  private showTerrainTooltip(tile: TileDefinition, pointer: Phaser.Input.Pointer): void {
    const info = TERRAIN_INFO[tile.terrain]
    this.showTooltip(`地形 · ${info.name}`, info.description, pointer)
  }

  private showUnitTooltip(unit: UnitState, pointer: Phaser.Input.Pointer): void {
    const camp = unit.side === 'allies' ? '友軍' : '敵軍'
    const body = [
      `${unit.title} · ${ROLE_LABELS[unit.role]}`,
      `生命 ${Math.max(0, unit.hp)}/${unit.maxHp}　攻擊 ${unit.attack}　護甲 ${unit.armor}`,
      `移動 ${unit.move} 格　射程 ${unit.range} 格`,
      `技能「${unit.ability.name}」：${unit.ability.description}`,
    ].join('\n')
    this.showTooltip(`${camp} · ${unit.name}`, body, pointer)
  }

  private showTooltip(title: string, body: string, pointer: Phaser.Input.Pointer): void {
    this.hideTooltip()
    const width = Math.min(this.layout.portrait ? this.layout.width - 24 : 340, 340)
    const padding = 14
    const titleText = this.add.text(padding, padding, title, {
      fontFamily: FONT_SANS, fontSize: '16px', fontStyle: 'bold', color: '#efc15a',
    })
    const bodyText = this.add.text(padding, 43, body, {
      fontFamily: FONT_SANS, fontSize: '13px', color: '#edf2ed', lineSpacing: 6,
      wordWrap: { width: width - padding * 2, useAdvancedWrap: true },
    })
    const height = bodyText.y + bodyText.height + padding
    const background = this.add.rectangle(0, 0, width, height, 0x0a1512, 0.97)
      .setOrigin(0)
      .setStrokeStyle(2, UI.gold, 0.82)
    this.tooltip = this.add.container(0, 0, [background, titleText, bodyText]).setDepth(40)
    this.tooltip.setData('width', width)
    this.tooltip.setData('height', height)
    this.positionTooltip(pointer)
  }

  private positionTooltip(pointer: Phaser.Input.Pointer): void {
    if (!this.tooltip) return
    const width = this.tooltip.getData('width') as number
    const height = this.tooltip.getData('height') as number
    if (this.layout.portrait) {
      this.tooltip.setPosition(12, 122)
      return
    }
    const x = Phaser.Math.Clamp(pointer.x + 18, 10, this.layout.width - width - 10)
    const y = Phaser.Math.Clamp(pointer.y + 18, 92, this.layout.height - height - 10)
    this.tooltip.setPosition(x, y)
  }

  private hideTooltip(): void {
    this.tooltip?.destroy(true)
    this.tooltip = undefined
  }

  private handleUnitClick(unit: UnitState): void {
    if (this.finished || unit.hp <= 0) return
    if (!this.playerPhase) return

    const selected = this.selectedUnit()
    if (unit.side === 'allies') {
      if (unit.acted) return
      this.selectedId = unit.id
      this.abilityMode = false
      audioDirector.play('select')
      this.refreshSelection()
      return
    }

    if (!selected || selected.acted) return
    const range = this.abilityMode ? selected.ability.range : selected.range
    if (hexDistance(selected, unit) > range) {
      this.flashMessage('目標超出攻擊範圍')
      return
    }

    if (this.abilityMode) this.useTargetedAbility(selected, unit)
    else this.attack(selected, unit)
  }

  private handleTileClick(tile: TileDefinition): void {
    if (!this.playerPhase || this.finished || tile.terrain === 'water' || this.abilityMode) return
    const selected = this.selectedUnit()
    if (!selected || selected.moved || selected.acted || this.getUnitAt(tile)) return
    const reachable = this.reachableFor(selected)
    if (!reachable.some((hex) => hexKey(hex) === hexKey(tile))) return

    selected.q = tile.q
    selected.r = tile.r
    selected.moved = true
    audioDirector.play('move')
    const center = this.hexCenter(tile)
    const token = this.tokens.get(selected.id)
    token?.setDepth(5 + center.y / 10_000)
    this.tweens.add({ targets: token, x: center.x, y: center.y, duration: 210, ease: 'Sine.Out' })
    this.refreshSelection()
  }

  private attack(attacker: UnitState, target: UnitState, power?: number): void {
    if (attacker.acted || target.hp <= 0) return
    const damage = this.calculateDamage(attacker, target, power)
    this.applyDamage(target, damage)
    attacker.acted = true
    attacker.moved = true
    this.abilityMode = false
    audioDirector.play(power ? 'ability' : 'hit')
    this.animateAttack(attacker, target)
    this.selectedId = undefined
    this.refreshSelection()
    this.time.delayedCall(350, () => this.checkBattleState())
  }

  private useTargetedAbility(attacker: UnitState, target: UnitState): void {
    if (attacker.abilityUsed) return
    attacker.abilityUsed = true
    if (attacker.ability.kind === 'volley') {
      const victims = this.units.filter((unit) => unit.side !== attacker.side && unit.hp > 0 && hexDistance(unit, target) <= 1)
      victims.forEach((victim) => this.applyDamage(victim, attacker.ability.power))
      attacker.acted = true
      attacker.moved = true
      audioDirector.play('ability')
      this.flashMessage(`${attacker.ability.name}!`)
      this.selectedId = undefined
      this.abilityMode = false
      this.refreshSelection()
      this.time.delayedCall(350, () => this.checkBattleState())
    } else if (attacker.ability.kind === 'lunge') {
      this.attack(attacker, target, attacker.ability.power)
    }
  }

  private useImmediateAbility(unit: UnitState): void {
    if (unit.abilityUsed || unit.acted) return
    unit.abilityUsed = true
    unit.acted = true
    unit.moved = true
    if (unit.ability.kind === 'guard') {
      unit.guardTurns = 2
      this.flashMessage(`${unit.name}展開防波壁`)
    } else if (unit.ability.kind === 'heal') {
      this.units
        .filter((candidate) => candidate.side === unit.side && candidate.hp > 0 && hexDistance(candidate, unit) <= unit.ability.range)
        .forEach((candidate) => this.applyHealing(candidate, unit.ability.power))
      this.flashMessage('回流恢復了友軍生命')
    }
    audioDirector.play('ability')
    this.selectedId = undefined
    this.refreshSelection()
    this.time.delayedCall(300, () => this.checkBattleState())
  }

  private waitSelected(): void {
    const unit = this.selectedUnit()
    if (!unit) return
    unit.moved = true
    unit.acted = true
    this.selectedId = undefined
    this.abilityMode = false
    this.refreshSelection()
    this.checkBattleState()
  }

  private endPlayerTurn(): void {
    if (!this.playerPhase || this.finished) return
    this.units.filter((unit) => unit.side === 'allies' && unit.hp > 0).forEach((unit) => {
      unit.moved = true
      unit.acted = true
    })

    if (this.stage.objective === 'hold' && this.stage.objectiveHex) {
      const holder = this.units.some((unit) => unit.side === 'allies' && unit.hp > 0 && hexKey(unit) === hexKey(this.stage.objectiveHex!))
      this.holdProgress = holder ? this.holdProgress + 1 : 0
      this.objectiveText?.setText(this.objectiveStatus())
      if (this.holdProgress >= (this.stage.objectiveTurns ?? 2)) {
        this.finishBattle(true)
        return
      }
    }

    this.playerPhase = false
    this.selectedId = undefined
    this.abilityMode = false
    this.clearHighlights()
    this.phaseText?.setText(`第 ${this.round} 回合 · 敵方行動`).setColor('#e36f58')
    this.refreshSelection()
    this.time.delayedCall(350, () => this.runEnemyTurn(0))
  }

  private runEnemyTurn(index: number): void {
    if (this.finished) return
    const enemies = this.units.filter((unit) => unit.side === 'enemies' && unit.hp > 0)
    if (index >= enemies.length) {
      this.beginNextRound()
      return
    }

    const enemy = enemies[index]
    const allies = this.units.filter((unit) => unit.side === 'allies' && unit.hp > 0)
    if (allies.length === 0) {
      this.finishBattle(false)
      return
    }
    const target = [...allies].sort((a, b) => hexDistance(enemy, a) - hexDistance(enemy, b) || a.hp - b.hp)[0]
    if (hexDistance(enemy, target) <= enemy.range) {
      const damage = this.calculateDamage(enemy, target)
      this.applyDamage(target, damage)
      this.animateAttack(enemy, target)
      audioDirector.play('hit')
      this.time.delayedCall(460, () => {
        if (!this.checkBattleState()) this.runEnemyTurn(index + 1)
      })
      return
    }

    const occupied = new Set(this.livingUnits().filter((unit) => unit.id !== enemy.id).map(hexKey))
    const destination = shortestStep(enemy, target, enemy.move, this.tiles, occupied)
    enemy.q = destination.q
    enemy.r = destination.r
    const center = this.hexCenter(destination)
    this.tokens.get(enemy.id)?.setDepth(5 + center.y / 10_000)
    audioDirector.play('move')
    this.tweens.add({
      targets: this.tokens.get(enemy.id),
      x: center.x,
      y: center.y,
      duration: 260,
      ease: 'Sine.Out',
      onComplete: () => {
        if (hexDistance(enemy, target) <= enemy.range && target.hp > 0) {
          const damage = this.calculateDamage(enemy, target)
          this.applyDamage(target, damage)
          this.animateAttack(enemy, target)
          audioDirector.play('hit')
        }
        this.time.delayedCall(420, () => {
          if (!this.checkBattleState()) this.runEnemyTurn(index + 1)
        })
      },
    })
  }

  private beginNextRound(): void {
    this.round += 1
    if (this.round > this.stage.roundLimit) {
      this.finishBattle(false)
      return
    }
    this.playerPhase = true
    this.units.filter((unit) => unit.hp > 0).forEach((unit) => {
      unit.moved = false
      unit.acted = false
      if (unit.guardTurns > 0) unit.guardTurns -= 1
      const terrain = this.tileMap.get(hexKey(unit))?.terrain
      if (terrain === 'village') this.applyHealing(unit, Math.ceil(unit.maxHp * 0.12))
    })
    this.phaseText?.setText(`第 ${this.round} 回合 · 我方行動`).setColor('#efc15a')
    this.flashMessage(`第 ${this.round} 回合`)
    this.refreshSelection()
  }

  private checkBattleState(): boolean {
    if (this.finished) return true
    const livingAllies = this.units.filter((unit) => unit.side === 'allies' && unit.hp > 0)
    const livingEnemies = this.units.filter((unit) => unit.side === 'enemies' && unit.hp > 0)
    if (livingAllies.length === 0) {
      this.finishBattle(false)
      return true
    }
    const won = this.stage.objective === 'commander'
      ? !livingEnemies.some((unit) => unit.role === 'commander')
      : this.stage.objective === 'eliminate'
        ? livingEnemies.length === 0
        : livingEnemies.length === 0 || this.holdProgress >= (this.stage.objectiveTurns ?? 2)
    if (won) {
      this.finishBattle(true)
      return true
    }
    if (this.playerPhase && livingAllies.every((unit) => unit.acted)) {
      this.time.delayedCall(320, () => this.endPlayerTurn())
    }
    return false
  }

  private finishBattle(victory: boolean): void {
    if (this.finished) return
    this.finished = true
    this.playerPhase = false
    audioDirector.stopMusic()
    audioDirector.play(victory ? 'victory' : 'defeat')
    const fallenAllies = this.initialAllies - this.units.filter((unit) => unit.side === 'allies' && unit.hp > 0).length
    const result: BattleResult = {
      victory,
      stars: calculateStars(victory, this.round, this.stage.swiftRound, fallenAllies),
      rounds: this.round,
      fallenAllies,
      stageId: this.stage.id,
    }
    recordResult(result, this.stageIndex)
    this.showBattleEnd(result)
  }

  private showBattleEnd(result: BattleResult): void {
    const { width, height } = this.layout
    const overlay = this.add.rectangle(0, 0, width, height, 0x06100d, 0.82).setOrigin(0).setDepth(30)
    const banner = this.add.rectangle(width / 2, height / 2, Math.min(460, width - 30), 220, UI.panel, 1)
      .setStrokeStyle(2, result.victory ? UI.gold : UI.enemy, 1)
      .setDepth(31)
    this.add.text(width / 2, height / 2 - 66, result.victory ? '戰鬥勝利' : '戰鬥失敗', {
      fontFamily: FONT_DISPLAY, fontSize: '32px', fontStyle: 'bold', color: UI.cream,
    }).setOrigin(0.5).setDepth(32)
    this.add.text(width / 2, height / 2 - 18, result.victory ? `${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}` : '我方戰線已被突破', {
      fontFamily: FONT_SANS, fontSize: result.victory ? '36px' : '15px', color: result.victory ? '#efc15a' : '#d6b0aa',
    }).setOrigin(0.5).setDepth(32)
    const button = this.createButton(width / 2 - 90, height / 2 + 52, 180, 44, '繼續', () => {
      overlay.destroy()
      banner.destroy()
      this.scene.start('campaign', { result })
    }, 14)
    button.setDepth(32)
  }

  private refreshSelection(): void {
    this.clearHighlights()
    this.detailObjects.forEach((object) => object.destroy())
    this.detailObjects = []
    const unit = this.selectedUnit()
    if (!unit) {
      this.drawBattleLegend()
      return
    }

    this.tokens.forEach((token, id) => token.setScale(id === unit.id ? 1.12 : 1))
    if (this.playerPhase && !unit.acted) this.drawHighlights(unit)
    this.drawUnitDetails(unit)
  }

  private drawBattleLegend(): void {
    const x = this.layout.panelX + 18
    const y = this.layout.panelY + 18
    const maxWidth = this.layout.panelWidth - 36
    const allies = this.units.filter((unit) => unit.side === 'allies' && unit.hp > 0)
    const enemies = this.units.filter((unit) => unit.side === 'enemies' && unit.hp > 0)
    const title = this.add.text(x, y, '鹽風戰團', { fontFamily: FONT_SANS, fontSize: '15px', fontStyle: 'bold', color: '#efc15a' }).setDepth(9)
    const roster = allies.map((unit) => `${unit.name}　生命 ${unit.hp}/${unit.maxHp}`).join('\n')
    const body = this.add.text(x, y + 27, roster, {
      fontFamily: FONT_SANS, fontSize: '13px', color: '#c3cec6', lineSpacing: 7, wordWrap: { width: maxWidth, useAdvancedWrap: true },
    }).setDepth(9)
    const opposition = this.add.text(x, y + (this.layout.portrait ? 100 : 144), `灰燼艦隊 · 尚存 ${enemies.length} 支部隊`, {
      fontFamily: FONT_SANS, fontSize: '12px', fontStyle: 'bold', color: '#e68a77', wordWrap: { width: maxWidth },
    }).setDepth(9)
    this.detailObjects.push(title, body, opposition)
  }

  private drawUnitDetails(unit: UnitState): void {
    const x = this.layout.panelX + 18
    const y = this.layout.panelY + 16
    const maxWidth = this.layout.panelWidth - 36
    const name = this.add.text(x, y, unit.name, { fontFamily: FONT_DISPLAY, fontSize: '21px', fontStyle: 'bold', color: UI.cream }).setDepth(9)
    const title = this.add.text(x, y + 28, `${unit.title} · ${ROLE_LABELS[unit.role]}`, { fontFamily: FONT_SANS, fontSize: '12px', color: '#efc15a' }).setDepth(9)
    const stats = this.add.text(x, y + 52, `生命 ${Math.max(0, unit.hp)}/${unit.maxHp}　攻擊 ${unit.attack}　護甲 ${unit.armor}\n移動 ${unit.move} 格　射程 ${unit.range} 格`, {
      fontFamily: FONT_SANS, fontSize: '13px', color: '#c6d2ca', lineSpacing: 6,
    }).setDepth(9)
    this.detailObjects.push(name, title, stats)

    if (unit.side === 'allies' && this.playerPhase && !unit.acted) {
      const abilityY = this.layout.portrait ? y + 102 : y + 112
      const ability = this.add.text(x, abilityY, unit.ability.name, { fontFamily: FONT_SANS, fontSize: '14px', fontStyle: 'bold', color: unit.abilityUsed ? '#69766f' : '#efc15a' }).setDepth(9)
      const description = this.add.text(x, abilityY + 18, unit.ability.description, {
        fontFamily: FONT_SANS, fontSize: '12px', color: '#9eafa4', wordWrap: { width: maxWidth, useAdvancedWrap: true }, lineSpacing: 4,
      }).setDepth(9)
      this.detailObjects.push(ability, description)

      const buttonY = this.layout.portrait ? this.layout.panelY + this.layout.panelHeight - 42 : Math.min(this.layout.panelY + this.layout.panelHeight - 156, abilityY + 70)
      const half = (maxWidth - 8) / 2
      const abilityButton = this.createButton(x, buttonY, half, 34, unit.abilityUsed ? '已使用' : '施放技能', () => {
        if (unit.abilityUsed) return
        if (unit.ability.kind === 'guard' || unit.ability.kind === 'heal') this.useImmediateAbility(unit)
        else {
          this.abilityMode = !this.abilityMode
          this.refreshSelection()
        }
      }, 12, unit.abilityUsed)
      const waitButton = this.createButton(x + half + 8, buttonY, half, 34, '待命', () => this.waitSelected(), 12, true)
      this.detailObjects.push(abilityButton, waitButton)
    }
  }

  private drawHighlights(unit: UnitState): void {
    if (!this.abilityMode && !unit.moved) {
      this.reachableFor(unit).forEach((hex) => this.addHighlight(hex, UI.ally, 0.23))
    }
    const range = this.abilityMode ? unit.ability.range : unit.range
    this.units
      .filter((target) => target.side !== unit.side && target.hp > 0 && hexDistance(unit, target) <= range)
      .forEach((target) => this.addHighlight(target, this.abilityMode ? UI.gold : UI.enemy, 0.3))
  }

  private addHighlight(hex: HexCoord, color: number, alpha: number): void {
    const center = this.hexCenter(hex)
    const highlight = this.add.polygon(center.x, center.y, this.hexPoints(this.layout.hexSize * 0.88), color, alpha)
      .setStrokeStyle(2, color, 0.95)
      .setDepth(3)
    this.highlights.push(highlight)
  }

  private clearHighlights(): void {
    this.highlights.forEach((highlight) => highlight.destroy())
    this.highlights = []
    this.tokens.forEach((token) => token.setScale(1))
  }

  private reachableFor(unit: UnitState): HexCoord[] {
    const occupied = new Set(this.livingUnits().filter((candidate) => candidate.id !== unit.id).map(hexKey))
    return reachableHexes(unit, unit.move, this.tiles, occupied)
  }

  private calculateDamage(attacker: UnitState, target: UnitState, fixedPower?: number): number {
    if (fixedPower) return fixedPower
    let damage = Math.max(8, attacker.attack - target.armor * 0.55)
    const attackerTerrain = this.tileMap.get(hexKey(attacker))?.terrain
    const targetTerrain = this.tileMap.get(hexKey(target))?.terrain
    if (attackerTerrain === 'hill' && targetTerrain !== 'hill') damage *= 1.25
    if (targetTerrain === 'forest') damage *= 0.65
    if (targetTerrain === 'marsh') damage *= 1.2
    if (target.guardTurns > 0) damage *= 0.5
    damage *= 0.92 + Math.random() * 0.16
    return Math.max(1, Math.round(damage))
  }

  private applyDamage(target: UnitState, damage: number): void {
    target.hp = Math.max(0, target.hp - damage)
    this.floatNumber(target, `-${damage}`, '#ffd2c8')
    this.updateToken(target)
    if (target.hp <= 0) {
      const token = this.tokens.get(target.id)
      if (token) this.tweens.add({ targets: token, alpha: 0, scale: 0.5, duration: 280, onComplete: () => token.setVisible(false) })
    }
  }

  private applyHealing(target: UnitState, amount: number): void {
    if (target.hp <= 0) return
    const restored = Math.min(amount, target.maxHp - target.hp)
    if (restored <= 0) return
    target.hp += restored
    this.floatNumber(target, `+${restored}`, '#9ff0c8')
    this.updateToken(target)
  }

  private updateToken(unit: UnitState): void {
    const token = this.tokens.get(unit.id)
    const fill = token?.getByName('hp-fill') as Phaser.GameObjects.Rectangle | null
    const background = token?.getByName('hp-bg') as Phaser.GameObjects.Rectangle | null
    if (fill && background) fill.displayWidth = background.width * Math.max(0, unit.hp / unit.maxHp)
  }

  private animateAttack(attacker: UnitState, target: UnitState): void {
    const token = this.tokens.get(attacker.id)
    if (!token) return
    const origin = this.hexCenter(attacker)
    const destination = this.hexCenter(target)
    const distance = Phaser.Math.Distance.Between(origin.x, origin.y, destination.x, destination.y)
    const amount = Math.min(this.layout.hexSize * 0.42, distance * 0.18)
    const angle = Phaser.Math.Angle.Between(origin.x, origin.y, destination.x, destination.y)
    this.tweens.add({
      targets: token,
      x: origin.x + Math.cos(angle) * amount,
      y: origin.y + Math.sin(angle) * amount,
      duration: 90,
      yoyo: true,
      ease: 'Quad.Out',
    })
    this.cameras.main.shake(90, 0.0022)
  }

  private floatNumber(unit: UnitState, label: string, color: string): void {
    const center = this.hexCenter(unit)
    const text = this.add.text(center.x, center.y - this.layout.hexSize * 0.75, label, {
      fontFamily: FONT_SANS, fontSize: '16px', fontStyle: 'bold', color, stroke: '#07100d', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(12)
    this.tweens.add({ targets: text, y: text.y - 28, alpha: 0, duration: 650, onComplete: () => text.destroy() })
  }

  private flashMessage(message: string): void {
    const text = this.add.text(this.layout.boardX + this.layout.boardWidth / 2, this.layout.boardY + 22, message, {
      fontFamily: FONT_SANS, fontSize: '15px', fontStyle: 'bold', color: UI.cream, backgroundColor: '#0b1512d9', padding: { x: 12, y: 7 },
    }).setOrigin(0.5).setDepth(15)
    this.tweens.add({ targets: text, alpha: 0, y: text.y - 12, delay: 700, duration: 350, onComplete: () => text.destroy() })
  }

  private objectiveStatus(): string {
    if (this.stage.objective === 'hold') return `${this.stage.objectiveLabel} · 進度 ${this.holdProgress}/${this.stage.objectiveTurns ?? 2}`
    return `${this.stage.objectiveLabel} · 回合上限 ${this.stage.roundLimit}`
  }

  private selectedUnit(): UnitState | undefined {
    return this.units.find((unit) => unit.id === this.selectedId && unit.hp > 0)
  }

  private livingUnits(): UnitState[] {
    return this.units.filter((unit) => unit.hp > 0)
  }

  private getUnitAt(hex: HexCoord): UnitState | undefined {
    return this.livingUnits().find((unit) => hexKey(unit) === hexKey(hex))
  }

  private hexCenter(hex: HexCoord): { x: number; y: number } {
    const s = this.layout.hexSize
    const rawWidth = Math.sqrt(3) * s * (this.stage.width + this.stage.height / 2 - 0.5)
    const rawHeight = s * (1.5 * ISO_Y_SCALE * (this.stage.height - 1) + 2 * ISO_Y_SCALE)
    const offsetX = this.layout.boardX + (this.layout.boardWidth - rawWidth) / 2 + Math.sqrt(3) * s / 2
    const offsetY = this.layout.boardY + (this.layout.boardHeight - rawHeight) / 2 + s * ISO_Y_SCALE
    return {
      x: offsetX + Math.sqrt(3) * s * (hex.q + hex.r / 2),
      y: offsetY + 1.5 * s * ISO_Y_SCALE * hex.r,
    }
  }

  private hexPoints(size: number): number[] {
    const points: number[] = []
    for (let i = 0; i < 6; i += 1) {
      const angle = Phaser.Math.DegToRad(60 * i - 30)
      points.push(Math.cos(angle) * size, Math.sin(angle) * size * ISO_Y_SCALE)
    }
    return points
  }

  private createButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    fontSize: number,
    subtle = false,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(12)
    const background = this.add.rectangle(0, 0, width, height, subtle ? UI.panelLight : UI.gold, 1).setOrigin(0)
      .setStrokeStyle(1, subtle ? 0x708278 : UI.gold, subtle ? 0.55 : 1)
    const text = this.add.text(width / 2, height / 2, label, {
      fontFamily: FONT_SANS, fontSize: `${fontSize}px`, fontStyle: 'bold', color: subtle ? '#d1dad3' : '#17211d',
    }).setOrigin(0.5)
    container.add([background, text]).setSize(width, height)
    background.setInteractive({ useHandCursor: true })
    background.on('pointerover', () => background.setAlpha(0.82))
    background.on('pointerout', () => background.setAlpha(1))
    background.on('pointerdown', onClick)
    return container
  }
}
