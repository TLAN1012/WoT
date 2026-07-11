import Phaser from 'phaser'
import { audioDirector } from './audio'
import { STAGES } from './data'
import type { BattleResult, StageDefinition } from './types'

const COLORS = {
  ink: 0x0b1412,
  panel: 0x12221d,
  gold: 0xefc15a,
  cream: '#f7efd8',
  muted: '#b8c5bc',
  enemy: 0xd66b57,
}

const FONT_SANS = '"PingFang TC", "Noto Sans TC", sans-serif'
const FONT_DISPLAY = '"PingFang TC", "Noto Sans TC", serif'

function storyAsset(stage: StageDefinition): string {
  return `${import.meta.env.BASE_URL}assets/story/${stage.id}.jpg`
}

function addCoverImage(scene: Phaser.Scene, key: string, width: number, height: number): Phaser.GameObjects.Image {
  const source = scene.textures.get(key).getSourceImage() as HTMLImageElement
  const scale = Math.max(width / source.width, height / source.height)
  return scene.add.image(width / 2, height / 2, key).setDisplaySize(source.width * scale, source.height * scale)
}

function addButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  subtle = false,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y)
  const background = scene.add.rectangle(0, 0, width, height, subtle ? 0x26352f : COLORS.gold, 1).setOrigin(0)
    .setStrokeStyle(1, subtle ? 0x70827a : 0xffdf89, 0.8)
  const text = scene.add.text(width / 2, height / 2, label, {
    fontFamily: FONT_SANS,
    fontSize: width < 60 ? '21px' : '14px',
    fontStyle: 'bold',
    color: subtle ? '#d2ddd6' : '#16211d',
  }).setOrigin(0.5)
  container.add([background, text]).setSize(width, height)
  background.setInteractive({ useHandCursor: true })
  background.on('pointerover', () => background.setFillStyle(subtle ? 0x354a41 : 0xffd979))
  background.on('pointerout', () => background.setFillStyle(subtle ? 0x26352f : COLORS.gold))
  background.on('pointerdown', onClick)
  return container
}

export class BriefingScene extends Phaser.Scene {
  private stageIndex = 0
  private stage!: StageDefinition

  constructor() {
    super('briefing')
  }

  init(data: { stageIndex?: number }): void {
    this.stageIndex = Phaser.Math.Clamp(data.stageIndex ?? 0, 0, STAGES.length - 1)
    this.stage = STAGES[this.stageIndex]
  }

  preload(): void {
    this.load.image(`briefing-${this.stage.id}`, storyAsset(this.stage))
  }

  create(): void {
    const width = this.scale.width
    const height = this.scale.height
    const portrait = width < 720
    const panelTop = portrait ? height * 0.53 : height * 0.61
    const padding = portrait ? 20 : 44
    const buttonWidth = portrait ? width - padding * 2 : 190
    const buttonX = portrait ? padding : width - padding - buttonWidth
    const buttonY = height - 58
    const contentWidth = portrait ? width - padding * 2 : Math.min(760, width - buttonWidth - padding * 3)

    this.cameras.main.setBackgroundColor(COLORS.ink)
    addCoverImage(this, `briefing-${this.stage.id}`, width, panelTop)
    this.add.rectangle(0, 0, width, 68, COLORS.ink, 0.78).setOrigin(0)
    this.add.rectangle(0, panelTop, width, height - panelTop, COLORS.panel, 0.98).setOrigin(0)
      .setStrokeStyle(1, 0x7a9184, 0.45)

    this.add.text(padding, 20, `第 ${this.stage.chapter} 章 · 戰役簡報`, {
      fontFamily: FONT_SANS, fontSize: portrait ? '13px' : '14px', fontStyle: 'bold', color: '#efc15a',
    })
    addButton(this, width - padding - 44, 13, 44, 42, '←', () => {
      audioDirector.play('select')
      this.scene.start('campaign')
    }, true)

    const titleY = panelTop + (portrait ? 18 : 24)
    this.add.text(padding, titleY, this.stage.name, {
      fontFamily: FONT_DISPLAY,
      fontSize: portrait ? '30px' : '40px',
      fontStyle: 'bold',
      color: COLORS.cream,
    })
    this.add.text(padding, titleY + (portrait ? 39 : 51), this.stage.subtitle, {
      fontFamily: FONT_SANS, fontSize: portrait ? '14px' : '16px', color: '#efc15a',
    })
    this.add.text(padding, titleY + (portrait ? 66 : 82), this.stage.briefing, {
      fontFamily: FONT_SANS,
      fontSize: portrait ? '14px' : '15px',
      color: '#d5dfd8',
      lineSpacing: 7,
      wordWrap: { width: contentWidth, useAdvancedWrap: true },
    })

    const objectiveY = portrait ? buttonY - 47 : height - 58
    this.add.text(padding, objectiveY, '任務目標', {
      fontFamily: FONT_SANS, fontSize: '11px', fontStyle: 'bold', color: '#91a69a',
    })
    this.add.text(padding + (portrait ? 0 : 78), objectiveY + (portrait ? 17 : -1), `${this.stage.objectiveLabel} · 最多 ${this.stage.roundLimit} 回合`, {
      fontFamily: FONT_SANS,
      fontSize: portrait ? '13px' : '14px',
      fontStyle: 'bold',
      color: COLORS.cream,
      wordWrap: { width: portrait ? contentWidth : contentWidth - 78, useAdvancedWrap: true },
    })

    addButton(this, buttonX, buttonY, buttonWidth, 42, '開始戰役', () => {
      audioDirector.play('select')
      audioDirector.stopMusic()
      this.scene.start('battle', { stageIndex: this.stageIndex })
    })
    audioDirector.startMusic('campaign')
  }
}

export class ResultScene extends Phaser.Scene {
  private result!: BattleResult
  private stage!: StageDefinition

  constructor() {
    super('result')
  }

  init(data: { result: BattleResult }): void {
    this.result = data.result
    this.stage = STAGES.find((stage) => stage.id === this.result.stageId) ?? STAGES[0]
  }

  preload(): void {
    this.load.image('result-victory', `${import.meta.env.BASE_URL}assets/story/victory.jpg`)
    this.load.image('result-defeat', `${import.meta.env.BASE_URL}assets/story/defeat.jpg`)
  }

  create(): void {
    const width = this.scale.width
    const height = this.scale.height
    const portrait = width < 720
    const panelTop = portrait ? height * 0.52 : height * 0.63
    const padding = portrait ? 20 : 44
    const imageKey = this.result.victory ? 'result-victory' : 'result-defeat'
    const accent = this.result.victory ? COLORS.gold : COLORS.enemy
    const buttonWidth = portrait ? width - padding * 2 : 210
    const buttonX = portrait ? padding : width - padding - buttonWidth
    const buttonY = height - 58
    const outcome = this.result.victory ? this.stage.victoryText : this.stage.defeatText
    const contentWidth = portrait ? width - padding * 2 : Math.min(760, width - buttonWidth - padding * 3)

    this.cameras.main.setBackgroundColor(COLORS.ink)
    addCoverImage(this, imageKey, width, panelTop)
    this.add.rectangle(0, panelTop, width, height - panelTop, COLORS.panel, 0.98).setOrigin(0)
      .setStrokeStyle(2, this.result.victory ? COLORS.gold : 0x9f5449, 0.75)

    const titleY = panelTop + (portrait ? 18 : 25)
    this.add.text(padding, titleY, this.result.victory ? '戰役勝利' : '戰線撤退', {
      fontFamily: FONT_DISPLAY,
      fontSize: portrait ? '31px' : '43px',
      fontStyle: 'bold',
      color: COLORS.cream,
    })
    this.add.text(padding, titleY + (portrait ? 42 : 56), `${this.stage.name} · ${this.result.victory ? '任務完成' : '部隊已脫離戰場'}`, {
      fontFamily: FONT_SANS, fontSize: portrait ? '13px' : '15px', fontStyle: 'bold', color: Phaser.Display.Color.IntegerToColor(accent).rgba,
    })

    if (this.result.victory) {
      this.add.text(padding, titleY + (portrait ? 67 : 83), `${'★'.repeat(this.result.stars)}${'☆'.repeat(3 - this.result.stars)}`, {
        fontFamily: FONT_SANS, fontSize: portrait ? '28px' : '34px', color: '#efc15a',
      })
    }
    const outcomeY = titleY + (portrait ? 108 : 128)
    this.add.text(padding, outcomeY, outcome, {
      fontFamily: FONT_SANS,
      fontSize: portrait ? '14px' : '15px',
      color: '#d7e0da',
      lineSpacing: 7,
      wordWrap: { width: contentWidth, useAdvancedWrap: true },
    })
    this.add.text(padding, buttonY + 12, `完成回合 ${this.result.rounds} · 我方陣亡 ${this.result.fallenAllies}`, {
      fontFamily: FONT_SANS, fontSize: '12px', color: COLORS.muted,
    }).setVisible(!portrait)

    addButton(this, buttonX, buttonY, buttonWidth, 42, '返回大陸地圖', () => {
      audioDirector.play('select')
      this.scene.start('campaign')
    })
    audioDirector.stopMusic()
    audioDirector.play(this.result.victory ? 'victory' : 'defeat')
  }
}
