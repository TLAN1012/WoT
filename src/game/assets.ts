import Phaser from 'phaser'
import type { Terrain } from './types'

const ALLY_FRAMES = ['yao', 'sora', 'mei', 'taka'] as const
const ENEMY_FRAMES = ['ember_raider', 'salt_archer', 'mire_guard', 'cannoner', 'commander'] as const
const TERRAIN_FRAMES: Terrain[] = ['plain', 'forest', 'hill', 'marsh', 'village', 'water']

function addGridFrames(
  textures: Phaser.Textures.TextureManager,
  textureKey: string,
  columns: number,
  rows: number,
  names: readonly string[],
  prefix: string,
): void {
  const texture = textures.get(textureKey)
  const source = texture.getSourceImage() as HTMLImageElement
  const frameWidth = Math.floor(source.width / columns)
  const frameHeight = Math.floor(source.height / rows)

  names.forEach((name, index) => {
    const frameName = `${prefix}-${name}`
    if (texture.has(frameName)) return
    const column = index % columns
    const row = Math.floor(index / columns)
    texture.add(frameName, 0, column * frameWidth, row * frameHeight, frameWidth, frameHeight)
  })
}

export function registerAllyFrames(textures: Phaser.Textures.TextureManager): void {
  addGridFrames(textures, 'allies-sheet', 2, 2, ALLY_FRAMES, 'unit')
}

export function registerGeneratedFrames(textures: Phaser.Textures.TextureManager): void {
  registerAllyFrames(textures)
  addGridFrames(textures, 'enemies-sheet', 3, 2, ENEMY_FRAMES, 'unit')
  addGridFrames(textures, 'terrain-sheet', 3, 2, TERRAIN_FRAMES, 'terrain')
}

export function unitFrame(unitId: string): string {
  return `unit-${unitId.replace(/-\d+$/, '')}`
}

export function terrainFrame(terrain: Terrain): string {
  return `terrain-${terrain}`
}
