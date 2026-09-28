import { describe, expect, it } from 'vitest'
import { HERO_IDS, STAGES, UNIT_DEFINITIONS } from '../src/game/data'
import { createHexField, hexKey } from '../src/game/hex'

describe('campaign data', () => {
  it('ships ten archaeological campaign nodes with all objective types', () => {
    expect(STAGES).toHaveLength(10)
    expect(new Set(STAGES.map((stage) => stage.objective))).toEqual(new Set(['eliminate', 'hold', 'commander']))
    expect(new Set(STAGES.map((stage) => stage.archaeologyLabel)).size).toBe(10)
    expect(STAGES.every((stage) => stage.storyImage === `assets/story/neolithic/${stage.id}.png`)).toBe(true)
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

  it('deploys ranged casters at the edge and shield-priest units on the second line', () => {
    const fourthStage = STAGES[3]
    const deployedRoles = new Map(fourthStage.allies.map((ally) => [UNIT_DEFINITIONS[ally.unitId].role, ally.q]))
    expect(deployedRoles.get('ranger')).toBe(0)
    expect(deployedRoles.get('necromancer')).toBe(0)
    expect(deployedRoles.get('halberd')).toBe(1)
    expect(deployedRoles.get('priest')).toBe(1)
  })

  it('uses an actual hill for the fourth-stage high-ground objective', () => {
    const fourthStage = STAGES[3]
    const field = createHexField(fourthStage.width, fourthStage.height, fourthStage.terrain)
    const objective = field.find((hex) => hexKey(hex) === hexKey(fourthStage.objectiveHex!))
    expect(objective?.terrain).toBe('hill')
  })

  it('grows the founding party from three to nine with approachable limits', () => {
    expect(STAGES.map((stage) => stage.partySize)).toEqual([3, 3, 4, 4, 5, 6, 7, 8, 9, 9])
    expect(Math.max(...STAGES.map((stage) => stage.roundLimit))).toBeLessThanOrEqual(14)
    STAGES.forEach((stage) => {
      expect(stage.victoryText.length).toBeGreaterThan(20)
      expect(stage.defeatText.length).toBeGreaterThan(20)
      expect(stage.allies).toHaveLength(stage.partySize)
    })

    const enemies = Object.values(UNIT_DEFINITIONS).filter((unit) => unit.side === 'enemies')
    expect(Math.max(...enemies.map((unit) => unit.attack))).toBe(28)
    expect(Math.max(...enemies.map((unit) => unit.maxHp))).toBe(145)
  })
})
