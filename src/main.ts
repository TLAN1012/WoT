import Phaser from 'phaser'
import './style.css'
import { BattleScene } from './game/BattleScene'
import { CampaignScene } from './game/CampaignScene'
import { audioDirector, type AudioDirector } from './game/audio'
import { BriefingScene, ResultScene } from './game/StoryScenes'

const TEXT_RESOLUTION = Math.min(window.devicePixelRatio || 1, 2)
const phaserTextFactory = Phaser.GameObjects.GameObjectFactory.prototype.text
Phaser.GameObjects.GameObjectFactory.prototype.text = function (
  x: number,
  y: number,
  text: string | string[],
  style: Phaser.Types.GameObjects.Text.TextStyle = {},
): Phaser.GameObjects.Text {
  return phaserTextFactory.call(this, x, y, text, { ...style, resolution: TEXT_RESOLUTION })
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0c1513',
  scene: [CampaignScene, BriefingScene, BattleScene, ResultScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
    preserveDrawingBuffer: true,
  },
  input: {
    activePointers: 3,
  },
})

declare global {
  interface Window {
    __WOT_GAME__: Phaser.Game
    __WOT_AUDIO__: AudioDirector
  }
}

window.__WOT_GAME__ = game
window.__WOT_AUDIO__ = audioDirector

window.addEventListener('beforeunload', () => game.destroy(true))
