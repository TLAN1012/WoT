import { describe, expect, it } from 'vitest'
import { HERO_IDS, STAGES, UNIT_DEFINITIONS } from '../src/game/data'
import { createHexField, hexKey } from '../src/game/hex'

describe('campaign data', () => {
  it('ships three distinct objective types', () => {
    expect(STAGES.map((stage) => stage.objective)).toEqual(['eliminate', 'hold', 'commander'])
  })

  it('places every regiment on a valid, passable, unique hex', () => {
    for (const stage of STAGES) {
      const field = createHexField(stage.width, stage.height, stage.terrain)
      const terrain = new Map(field.map((tile) => [hexKey(tile), tile.terrain]))
      const placements = [...stage.allies, ...stage.enemies]
      expect(new Set(placements.map(hexKey)).size).toBe(placements.length)
      placements.forEach((placement) => {
        expect(UNIT_DEFINITIONS[placement.unitId]).toBeDefined()
        expect(terrain.get(hexKey(placement))).not.toBe('water')
      })
    }
  })

  it('gives every hero a unique role and ability', () => {
    const heroes = HERO_IDS.map((id) => UNIT_DEFINITIONS[id])
    expect(new Set(heroes.map((hero) => hero.role)).size).toBe(heroes.length)
    expect(new Set(heroes.map((hero) => hero.ability.name)).size).toBe(heroes.length)
  })

  it('ships the easier campaign balance and complete outcome copy', () => {
    expect(STAGES.map((stage) => stage.roundLimit)).toEqual([14, 14, 12])
    STAGES.forEach((stage) => {
      expect(stage.victoryText.length).toBeGreaterThan(20)
      expect(stage.defeatText.length).toBeGreaterThan(20)
    })

    const enemies = Object.values(UNIT_DEFINITIONS).filter((unit) => unit.side === 'enemies')
    expect(Math.max(...enemies.map((unit) => unit.attack))).toBe(28)
    expect(Math.max(...enemies.map((unit) => unit.maxHp))).toBe(145)
  })
})
