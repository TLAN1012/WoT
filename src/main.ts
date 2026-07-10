import Phaser from 'phaser'
import './style.css'
import { BattleScene } from './game/BattleScene'
import { CampaignScene } from './game/CampaignScene'

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0c1513',
  scene: [CampaignScene, BattleScene],
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
  }
}

window.__WOT_GAME__ = game

window.addEventListener('beforeunload', () => game.destroy(true))
