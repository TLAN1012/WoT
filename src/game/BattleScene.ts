import Phaser from 'phaser'
import { audioDirector } from './audio'
import { HERO_IDS, STAGES, unitDefinition } from './data'
import { createHexField, hexDistance, hexKey, reachableHexes, shortestStep } from './hex'
import { calculateStars, recordResult } from './progress'
import type { BattleResult, HexCoord, StageDefinition, Terrain, TileDefinition, UnitState } from './types'

const TERRAIN_COLORS: Record<Terrain, number> = {
  plain: 0x6f875c,
  forest: 0x365b45,
  hill: 0x96784d,
  marsh: 0x506b61,
  village: 0x9b7954,
  water: 0x2f6570,
}

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

  constructor() {
    super('battle')
  }

  preload(): void {
    HERO_IDS.forEach((id) => this.load.image(`portrait-${id}`, `${import.meta.env.BASE_URL}portraits/${id}.png`))
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
    const top = portrait ? 116 : 86
    const panelWidth = portrait ? width - 20 : Math.min(300, width * 0.25)
    const panelHeight = portrait ? Math.min(190, height * 0.25) : height - top - 12
    const panelX = portrait ? 10 : width - panelWidth - 10
    const panelY = portrait ? height - panelHeight - 10 : top
    const boardX = portrait ? 10 : 16
    const boardY = top
    const boardWidth = portrait ? width - 20 : panelX - 26
    const boardHeight = portrait ? panelY - top - 10 : height - top - 14
    const sizeByWidth = boardWidth / (Math.sqrt(3) * (this.stage.width + this.stage.height / 2 + 0.2))
    const sizeByHeight = boardHeight / (1.5 * Math.max(1, this.stage.height - 1) + 2)
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
      const polygon = this.add.polygon(center.x, center.y, this.hexPoints(this.layout.hexSize), TERRAIN_COLORS[tile.terrain], tile.terrain === 'water' ? 0.92 : 1)
        .setStrokeStyle(2, 0x17251f, 0.62)
        .setInteractive({ useHandCursor: tile.terrain !== 'water' })
      polygon.on('pointerdown', () => this.handleTileClick(tile))
      this.drawTerrainMark(tile, center)
    }

    if (this.stage.objectiveHex) {
      const center = this.hexCenter(this.stage.objectiveHex)
      this.add.circle(center.x, center.y, this.layout.hexSize * 0.48, UI.gold, 0.13)
        .setStrokeStyle(3, UI.gold, 0.9)
      this.add.circle(center.x, center.y, this.layout.hexSize * 0.18, UI.gold, 0.8)
      this.tweens.add({ targets: this.add.circle(center.x, center.y, this.layout.hexSize * 0.55, UI.gold, 0.08), scale: 1.35, alpha: 0, duration: 1200, repeat: -1 })
    }
  }

  private drawTerrainMark(tile: TileDefinition, center: { x: number; y: number }): void {
    const g = this.add.graphics()
    const s = this.layout.hexSize
    if (tile.terrain === 'forest') {
      g.fillStyle(0x183a2b, 0.9)
      g.fillTriangle(center.x - s * 0.42, center.y + s * 0.28, center.x - s * 0.18, center.y - s * 0.34, center.x + s * 0.05, center.y + s * 0.28)
      g.fillTriangle(center.x - s * 0.03, center.y + s * 0.3, center.x + s * 0.2, center.y - s * 0.28, center.x + s * 0.43, center.y + s * 0.3)
    } else if (tile.terrain === 'hill') {
      g.lineStyle(3, 0x5f4a2f, 0.8)
      g.beginPath()
      g.moveTo(center.x - s * 0.5, center.y + s * 0.2)
      g.lineTo(center.x, center.y - s * 0.28)
      g.lineTo(center.x + s * 0.5, center.y + s * 0.2)
      g.strokePath()
    } else if (tile.terrain === 'marsh') {
      g.lineStyle(2, 0xa4c2ae, 0.35)
      g.lineBetween(center.x - s * 0.45, center.y - 3, center.x + s * 0.28, center.y - 3)
      g.lineBetween(center.x - s * 0.25, center.y + 7, center.x + s * 0.45, center.y + 7)
    } else if (tile.terrain === 'village') {
      g.fillStyle(0x3d3326, 0.9)
      g.fillRect(center.x - s * 0.22, center.y - 1, s * 0.44, s * 0.32)
      g.fillStyle(0xd7aa65, 0.95)
      g.fillTriangle(center.x - s * 0.3, center.y, center.x, center.y - s * 0.32, center.x + s * 0.3, center.y)
    } else if (tile.terrain === 'water') {
      g.lineStyle(2, 0xa0d5d5, 0.28)
      g.beginPath()
      g.arc(center.x - s * 0.2, center.y, s * 0.22, Math.PI, 0)
      g.arc(center.x + s * 0.22, center.y, s * 0.22, Math.PI, 0)
      g.strokePath()
    }
  }

  private createUnitToken(unit: UnitState): void {
    const center = this.hexCenter(unit)
    const s = this.layout.hexSize
    const token = this.add.container(center.x, center.y)
    const shadow = this.add.ellipse(2, s * 0.38, s * 1.18, s * 0.42, 0x07100d, 0.55)
    const ring = this.add.circle(0, 0, s * 0.56, unit.side === 'allies' ? UI.ally : UI.enemy, 0.95)
      .setStrokeStyle(3, unit.accent, 1)
    const portraitParts: Phaser.GameObjects.GameObject[] = unit.side === 'allies'
      ? [this.add.image(0, -s * 0.05, `portrait-${unit.id}`).setDisplaySize(s * 0.84, s * 0.84)]
      : [
          this.add.circle(0, -s * 0.06, s * 0.41, unit.color, 1),
          this.add.text(0, -s * 0.08, unit.sigil, {
            fontSize: `${Math.max(13, s * 0.48)}px`, fontStyle: 'bold', color: UI.cream,
          }).setOrigin(0.5),
        ]
    const hpBg = this.add.rectangle(-s * 0.48, s * 0.55, s * 0.96, 5, 0x08110e, 0.9).setOrigin(0).setName('hp-bg')
    const hpFill = this.add.rectangle(-s * 0.48, s * 0.55, s * 0.96, 5, unit.side === 'allies' ? UI.ally : UI.enemy, 1).setOrigin(0).setName('hp-fill')
    token.add([shadow, ring, ...portraitParts, hpBg, hpFill])
      .setSize(s * 1.25, s * 1.25)
      .setDepth(5)
      .setInteractive({ useHandCursor: true })
    token.on('pointerdown', () => this.handleUnitClick(unit))
    this.tokens.set(unit.id, token)
  }

  private drawInterface(): void {
    const { width, panelX, panelY, panelWidth, panelHeight, portrait } = this.layout
    this.add.rectangle(0, 0, width, portrait ? 106 : 76, UI.ink, 0.96).setOrigin(0).setDepth(10)
    this.add.text(18, 13, `CHAPTER ${this.stage.chapter} · ${this.stage.name.toUpperCase()}`, {
      fontFamily: 'Spectral, Georgia, serif',
      fontSize: portrait ? '17px' : '22px',
      fontStyle: 'bold',
      color: UI.cream,
    }).setDepth(11)
    this.objectiveText = this.add.text(20, portrait ? 55 : 45, this.objectiveStatus(), {
      fontSize: portrait ? '10px' : '11px', color: '#b9c8bd',
      wordWrap: { width: portrait ? width - 32 : Math.max(250, width * 0.5) },
    }).setDepth(11)
    this.phaseText = this.add.text(portrait ? 20 : width - 18, portrait ? 39 : 15, 'ROUND 1 · YOUR MOVE', {
      fontSize: portrait ? '10px' : '12px', fontStyle: 'bold', color: '#efc15a',
    }).setOrigin(portrait ? 0 : 1, 0).setDepth(11)

    this.add.rectangle(panelX, panelY, panelWidth, panelHeight, UI.panel, 0.97)
      .setOrigin(0)
      .setStrokeStyle(1, 0x7a9184, 0.4)
      .setDepth(8)

    const buttonWidth = portrait ? Math.min(124, (width - 40) / 3) : panelWidth - 28
    const actionsY = portrait ? 72 : panelY + panelHeight - 105
    const actionsX = portrait ? 10 : panelX + 14
    this.createButton(actionsX, actionsY, buttonWidth, 34, 'END TURN', () => this.endPlayerTurn(), 12)
    this.createButton(
      portrait ? actionsX + buttonWidth + 8 : actionsX,
      portrait ? actionsY : actionsY + 43,
      buttonWidth,
      34,
      'RETREAT',
      () => this.finishBattle(false),
      12,
      true,
    )
    if (portrait) {
      this.createButton(actionsX + (buttonWidth + 8) * 2, actionsY, buttonWidth, 34, audioDirector.isMuted() ? 'SOUND OFF' : 'SOUND ON', () => {
        audioDirector.setMuted(!audioDirector.isMuted())
      }, 10, true)
    }
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
      this.flashMessage('Target is out of range')
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
    this.tweens.add({ targets: this.tokens.get(selected.id), x: center.x, y: center.y, duration: 210, ease: 'Sine.Out' })
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
      this.flashMessage(`${unit.name} raises the Breakwater`)
    } else if (unit.ability.kind === 'heal') {
      this.units
        .filter((candidate) => candidate.side === unit.side && candidate.hp > 0 && hexDistance(candidate, unit) <= unit.ability.range)
        .forEach((candidate) => this.applyHealing(candidate, unit.ability.power))
      this.flashMessage('The Returning Current restores the line')
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
    this.phaseText?.setText(`ROUND ${this.round} · ENEMY MOVE`).setColor('#e36f58')
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
    this.phaseText?.setText(`ROUND ${this.round} · YOUR MOVE`).setColor('#efc15a')
    this.flashMessage(`Round ${this.round}`)
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
    this.add.text(width / 2, height / 2 - 66, result.victory ? 'VICTORY' : 'DEFEAT', {
      fontFamily: 'Spectral, Georgia, serif', fontSize: '30px', fontStyle: 'bold', color: UI.cream,
    }).setOrigin(0.5).setDepth(32)
    this.add.text(width / 2, height / 2 - 18, result.victory ? `${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}` : 'THE LINE HAS BROKEN', {
      fontSize: result.victory ? '34px' : '13px', color: result.victory ? '#efc15a' : '#d6b0aa',
    }).setOrigin(0.5).setDepth(32)
    const button = this.createButton(width / 2 - 90, height / 2 + 52, 180, 42, 'CONTINUE', () => {
      overlay.destroy()
      banner.destroy()
      this.scene.start('campaign', { result })
    }, 12)
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
    const title = this.add.text(x, y, 'SALTWIND COMPANY', { fontSize: '11px', fontStyle: 'bold', color: '#efc15a' }).setDepth(9)
    const roster = allies.map((unit) => `${unit.name.padEnd(10, ' ')} ${unit.hp}/${unit.maxHp}`).join('\n')
    const body = this.add.text(x, y + 27, roster, {
      fontSize: '10px', color: '#c3cec6', lineSpacing: 7, wordWrap: { width: maxWidth },
    }).setDepth(9)
    const opposition = this.add.text(x, y + (this.layout.portrait ? 82 : 124), `ASH FLEET · ${enemies.length} REGIMENTS`, {
      fontSize: '9px', fontStyle: 'bold', color: '#e68a77', wordWrap: { width: maxWidth },
    }).setDepth(9)
    this.detailObjects.push(title, body, opposition)
  }

  private drawUnitDetails(unit: UnitState): void {
    const x = this.layout.panelX + 18
    const y = this.layout.panelY + 16
    const maxWidth = this.layout.panelWidth - 36
    const name = this.add.text(x, y, unit.name, { fontFamily: 'Spectral, Georgia, serif', fontSize: '18px', fontStyle: 'bold', color: UI.cream }).setDepth(9)
    const title = this.add.text(x, y + 24, unit.title.toUpperCase(), { fontSize: '8px', color: '#efc15a', letterSpacing: 1 }).setDepth(9)
    const stats = this.add.text(x, y + 47, `HP ${Math.max(0, unit.hp)}/${unit.maxHp}   ATK ${unit.attack}   ARM ${unit.armor}\nMOVE ${unit.move}   RANGE ${unit.range}`, {
      fontSize: '10px', color: '#c6d2ca', lineSpacing: 5,
    }).setDepth(9)
    this.detailObjects.push(name, title, stats)

    if (unit.side === 'allies' && this.playerPhase && !unit.acted) {
      const abilityY = this.layout.portrait ? y + 91 : y + 102
      const ability = this.add.text(x, abilityY, unit.ability.name, { fontSize: '11px', fontStyle: 'bold', color: unit.abilityUsed ? '#69766f' : '#efc15a' }).setDepth(9)
      const description = this.add.text(x, abilityY + 18, unit.ability.description, {
        fontSize: '9px', color: '#9eafa4', wordWrap: { width: maxWidth }, lineSpacing: 3,
      }).setDepth(9)
      this.detailObjects.push(ability, description)

      const buttonY = this.layout.portrait ? this.layout.panelY + this.layout.panelHeight - 42 : Math.min(this.layout.panelY + this.layout.panelHeight - 156, abilityY + 70)
      const half = (maxWidth - 8) / 2
      const abilityButton = this.createButton(x, buttonY, half, 32, unit.abilityUsed ? 'USED' : 'ABILITY', () => {
        if (unit.abilityUsed) return
        if (unit.ability.kind === 'guard' || unit.ability.kind === 'heal') this.useImmediateAbility(unit)
        else {
          this.abilityMode = !this.abilityMode
          this.refreshSelection()
        }
      }, 9, unit.abilityUsed)
      const waitButton = this.createButton(x + half + 8, buttonY, half, 32, 'WAIT', () => this.waitSelected(), 9, true)
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
      fontSize: '14px', fontStyle: 'bold', color, stroke: '#07100d', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(12)
    this.tweens.add({ targets: text, y: text.y - 28, alpha: 0, duration: 650, onComplete: () => text.destroy() })
  }

  private flashMessage(message: string): void {
    const text = this.add.text(this.layout.boardX + this.layout.boardWidth / 2, this.layout.boardY + 22, message, {
      fontSize: '13px', fontStyle: 'bold', color: UI.cream, backgroundColor: '#0b1512d9', padding: { x: 10, y: 6 },
    }).setOrigin(0.5).setDepth(15)
    this.tweens.add({ targets: text, alpha: 0, y: text.y - 12, delay: 700, duration: 350, onComplete: () => text.destroy() })
  }

  private objectiveStatus(): string {
    if (this.stage.objective === 'hold') return `${this.stage.objectiveLabel} · ${this.holdProgress}/${this.stage.objectiveTurns ?? 2}`
    return `${this.stage.objectiveLabel} · Limit ${this.stage.roundLimit} rounds`
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
    const rawHeight = s * (1.5 * (this.stage.height - 1) + 2)
    const offsetX = this.layout.boardX + (this.layout.boardWidth - rawWidth) / 2 + Math.sqrt(3) * s / 2
    const offsetY = this.layout.boardY + (this.layout.boardHeight - rawHeight) / 2 + s
    return {
      x: offsetX + Math.sqrt(3) * s * (hex.q + hex.r / 2),
      y: offsetY + 1.5 * s * hex.r,
    }
  }

  private hexPoints(size: number): number[] {
    const points: number[] = []
    for (let i = 0; i < 6; i += 1) {
      const angle = Phaser.Math.DegToRad(60 * i - 30)
      points.push(Math.cos(angle) * size, Math.sin(angle) * size)
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
      fontSize: `${fontSize}px`, fontStyle: 'bold', color: subtle ? '#d1dad3' : '#17211d',
    }).setOrigin(0.5)
    container.add([background, text]).setSize(width, height)
    background.setInteractive({ useHandCursor: true })
    background.on('pointerover', () => background.setAlpha(0.82))
    background.on('pointerout', () => background.setAlpha(1))
    background.on('pointerdown', onClick)
    return container
  }
}
