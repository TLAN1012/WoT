import Phaser from 'phaser'
import { HERO_IDS, STAGES, unitDefinition } from './data'
import { audioDirector } from './audio'
import { loadProgress, resetProgress } from './progress'
import { registerAllyFrames, unitFrame } from './assets'
import type { CampaignProgress, StageDefinition } from './types'

const COLORS = {
  ink: 0x0d1715,
  panel: 0x152621,
  panelLight: 0x223a32,
  gold: 0xefc15a,
  cream: '#f7efd8',
  muted: '#a8b6aa',
  sea: 0x183b3d,
  land: 0x637f58,
  landDark: 0x3f5c45,
}

const FONT_SANS = '"PingFang TC", "Noto Sans TC", sans-serif'
const FONT_DISPLAY = '"PingFang TC", "Noto Sans TC", serif'

export class CampaignScene extends Phaser.Scene {
  private selectedStage = 0
  private progress: CampaignProgress = { unlockedStage: 0, stars: {} }

  constructor() {
    super('campaign')
  }

  preload(): void {
    this.load.image('allies-sheet', `${import.meta.env.BASE_URL}assets/generated/allies-sheet.png`)
    this.load.image('continent-map', `${import.meta.env.BASE_URL}assets/generated/saltwind-continent-map.png`)
  }

  init(): void {
    this.progress = loadProgress()
    this.selectedStage = Math.min(this.progress.unlockedStage, STAGES.length - 1)
  }

  create(): void {
    const width = this.scale.width
    const height = this.scale.height
    registerAllyFrames(this.textures)
    this.cameras.main.setBackgroundColor(COLORS.ink)
    this.drawWorld(width, height)
    this.drawHeader(width)
    this.drawCampaignRoute(width, height)
    this.drawStagePanel(STAGES[this.selectedStage], width, height)
    this.drawRoster(width, height)

    this.input.once('pointerdown', () => {
      void audioDirector.unlock()
    })
    audioDirector.startMusic('campaign')
  }

  private drawWorld(width: number, height: number): void {
    const graphics = this.add.graphics()
    graphics.fillStyle(0x665538, 1)
    graphics.fillRect(0, 0, width, height)
    const landscape = width >= 700
    const mapWidth = landscape ? width * 0.72 : width
    const mapTop = 84
    const mapBottom = landscape ? height : height * 0.62
    const mapHeight = mapBottom - mapTop
    const source = this.textures.get('continent-map').getSourceImage() as HTMLImageElement
    const scale = Math.min(mapWidth / source.width, mapHeight / source.height)
    const displayWidth = source.width * scale
    const displayHeight = source.height * scale
    this.add.image(mapWidth / 2, mapTop + mapHeight / 2, 'continent-map')
      .setDisplaySize(displayWidth, displayHeight)
      .setAlpha(0.98)
    graphics.lineStyle(1, 0xd8bd78, 0.32)
    graphics.strokeRect((mapWidth - displayWidth) / 2, mapTop + (mapHeight - displayHeight) / 2, displayWidth, displayHeight)
  }

  private drawHeader(width: number): void {
    this.add.rectangle(0, 0, width, 84, COLORS.ink, 0.88).setOrigin(0)
    this.add.text(28, 18, width < 600 ? 'WOT · 打狗戰記' : 'WARLORDS OF TAKAO', {
      fontFamily: FONT_DISPLAY,
      fontSize: width < 600 ? '26px' : '34px',
      fontStyle: 'bold',
      color: COLORS.cream,
    })
    this.add.text(30, width < 600 ? 53 : 59, '打狗軍閥 · 鹽風戰紀', {
      fontFamily: FONT_SANS,
      fontSize: '12px',
      color: '#efc15a',
      letterSpacing: 2,
    })

    this.createTextButton(width - 78, 20, 54, 42, audioDirector.isMuted() ? '靜音' : '音效', () => {
      audioDirector.setMuted(!audioDirector.isMuted())
      this.scene.restart()
    })
  }

  private drawCampaignRoute(width: number, height: number): void {
    const landscape = width >= 700
    const mapWidth = landscape ? width * 0.72 : width
    const mapTop = 84
    const mapBottom = landscape ? height : height * 0.62
    const mapHeight = mapBottom - mapTop
    const route = this.add.graphics()
    route.lineStyle(6, 0x17251f, 0.55)
    route.beginPath()

    STAGES.forEach((stage, index) => {
      const point = this.stagePoint(stage, mapWidth, mapTop, mapHeight)
      if (index === 0) route.moveTo(point.x, point.y)
      else route.lineTo(point.x, point.y)
    })
    route.strokePath()
    route.lineStyle(2, COLORS.gold, 0.6)
    route.strokePath()

    STAGES.forEach((stage, index) => {
      const point = this.stagePoint(stage, mapWidth, mapTop, mapHeight)
      const unlocked = index <= this.progress.unlockedStage
      const selected = index === this.selectedStage
      const node = this.add.container(point.x, point.y)
      const halo = this.add.circle(0, 0, selected ? 31 : 25, selected ? COLORS.gold : COLORS.ink, selected ? 0.34 : 0.5)
      const disc = this.add.circle(0, 0, selected ? 22 : 18, unlocked ? COLORS.panelLight : 0x26302d, 1)
        .setStrokeStyle(2, unlocked ? COLORS.gold : 0x59615e, 1)
      const label = this.add.text(0, -1, unlocked ? stage.chapter : '×', {
        fontFamily: FONT_DISPLAY,
        fontSize: selected ? '21px' : '17px',
        fontStyle: 'bold',
        color: unlocked ? COLORS.cream : '#717b76',
      }).setOrigin(0.5)
      const name = this.add.text(0, 32, stage.name, {
        fontFamily: FONT_SANS,
        fontSize: width < 600 ? '12px' : '14px',
        fontStyle: 'bold',
        color: unlocked ? COLORS.cream : '#718079',
        backgroundColor: '#10201bbd',
        padding: { x: 6, y: 3 },
      }).setOrigin(0.5)
      node.add([halo, disc, label, name])
      node.setSize(80, 72).setInteractive({ useHandCursor: unlocked })
      if (unlocked) {
        node.on('pointerdown', () => {
          audioDirector.play('select')
          this.selectedStage = index
          this.scene.restart()
        })
      }

      const stars = this.progress.stars[stage.id] ?? 0
      if (stars > 0) {
        this.add.text(point.x, point.y + 53, `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}`, {
          fontFamily: FONT_SANS, fontSize: '14px',
          color: '#efc15a',
        }).setOrigin(0.5)
      }
    })
  }

  private drawStagePanel(stage: StageDefinition, width: number, height: number): void {
    const landscape = width >= 700
    const panelX = landscape ? width * 0.72 : 12
    const panelY = landscape ? 96 : height * 0.63
    const panelWidth = landscape ? width * 0.28 - 14 : width - 24
    const panelHeight = landscape ? height - 110 : height * 0.36 - 12
    this.add.rectangle(panelX, panelY, panelWidth, panelHeight, COLORS.panel, 0.96)
      .setOrigin(0)
      .setStrokeStyle(1, 0x789181, 0.35)

    const padding = landscape ? 24 : 16
    const contentX = panelX + padding
    let y = panelY + padding
    this.add.text(contentX, y, `第 ${stage.chapter} 章`, {
      fontFamily: FONT_SANS, fontSize: '12px', color: '#efc15a', letterSpacing: 2,
    })
    y += 21
    this.add.text(contentX, y, stage.name, {
      fontFamily: FONT_DISPLAY,
      fontSize: landscape ? '29px' : '24px',
      fontStyle: 'bold',
      color: COLORS.cream,
      wordWrap: { width: panelWidth - padding * 2, useAdvancedWrap: true },
    })
    y += landscape ? 37 : 29
    this.add.text(contentX, y, stage.subtitle, {
      fontFamily: FONT_SANS, fontSize: '13px', color: '#a8b6aa', wordWrap: { width: panelWidth - padding * 2, useAdvancedWrap: true },
    })
    y += landscape ? 38 : 26
    if (landscape || height > 720) {
      const briefing = this.add.text(contentX, y, stage.briefing, {
        fontFamily: FONT_SANS, fontSize: '14px', color: '#d7dfd5', lineSpacing: 7,
        wordWrap: { width: panelWidth - padding * 2, useAdvancedWrap: true },
      })
      y += briefing.height + 21
    }

    this.add.text(contentX, y, '勝利條件', { fontFamily: FONT_SANS, fontSize: '11px', color: '#efc15a', letterSpacing: 1 })
    y += 18
    this.add.text(contentX, y, stage.objectiveLabel, {
      fontFamily: FONT_SANS, fontSize: '14px', fontStyle: 'bold', color: COLORS.cream,
      wordWrap: { width: panelWidth - padding * 2, useAdvancedWrap: true },
    })
    y += landscape ? 45 : 36

    const unlocked = STAGES.indexOf(stage) <= this.progress.unlockedStage
    const buttonY = Math.min(panelY + panelHeight - 58, y)
    this.createTextButton(contentX, buttonY, panelWidth - padding * 2, 44, unlocked ? '出陣' : '尚未解鎖', () => {
      if (!unlocked) return
      audioDirector.play('select')
      audioDirector.stopMusic()
      this.scene.start('briefing', { stageIndex: STAGES.indexOf(stage) })
    }, !unlocked)
  }

  private drawRoster(width: number, height: number): void {
    if (width < 700) return
    const x = 24
    const y = height - 94
    this.add.text(x, y - 24, '鹽風戰團', { fontFamily: FONT_SANS, fontSize: '12px', color: '#efc15a', letterSpacing: 2 })
    HERO_IDS.forEach((id, index) => {
      const hero = unitDefinition(id)
      const cx = x + index * 82
      this.add.circle(cx + 24, y + 24, 25, COLORS.ink, 0.72).setStrokeStyle(2, hero.accent, 0.85)
      this.add.image(cx + 24, y + 22, 'allies-sheet', unitFrame(id)).setDisplaySize(58, 58)
      this.add.text(cx + 24, y + 55, hero.name, { fontFamily: FONT_SANS, fontSize: '11px', color: '#d7dfd5' }).setOrigin(0.5)
    })
  }

  private stagePoint(stage: StageDefinition, mapWidth: number, mapTop: number, mapHeight: number): { x: number; y: number } {
    return {
      x: Math.max(48, mapWidth * stage.mapPosition.x),
      y: mapTop + mapHeight * stage.mapPosition.y,
    }
  }

  private createTextButton(
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    onClick: () => void,
    subtle = false,
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y)
    const background = this.add.rectangle(0, 0, width, height, subtle ? 0x26332e : COLORS.gold, subtle ? 0.55 : 1).setOrigin(0)
    const text = this.add.text(width / 2, height / 2, label, {
      fontFamily: FONT_SANS,
      fontSize: width < 80 ? '11px' : '14px',
      fontStyle: 'bold',
      color: subtle ? '#a8b6aa' : '#17211d',
    }).setOrigin(0.5)
    container.add([background, text]).setSize(width, height)
    if (!subtle) {
      background.setInteractive({ useHandCursor: true })
      background.on('pointerover', () => background.setFillStyle(0xffd878))
      background.on('pointerout', () => background.setFillStyle(COLORS.gold))
      background.on('pointerdown', onClick)
    }
    return container
  }
}

export function resetCampaignForDebug(): void {
  resetProgress()
}
