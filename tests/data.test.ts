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
})
