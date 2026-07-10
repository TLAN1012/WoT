import { describe, expect, it } from 'vitest'
import { createHexField, hexDistance, reachableHexes, shortestStep } from '../src/game/hex'

describe('hex rules', () => {
  it('calculates axial distance in every direction', () => {
    expect(hexDistance({ q: 0, r: 0 }, { q: 3, r: -2 })).toBe(3)
    expect(hexDistance({ q: 4, r: 4 }, { q: 1, r: 1 })).toBe(6)
  })

  it('blocks water and occupied cells', () => {
    const field = createHexField(4, 4, [{ q: 1, r: 0, terrain: 'water' }])
    const reachable = reachableHexes({ q: 0, r: 0 }, 2, field, new Set(['0,1']))
    expect(reachable).toEqual([])
  })

  it('allows entering marsh but stops movement there', () => {
    const field = createHexField(5, 3, [{ q: 1, r: 0, terrain: 'marsh' }])
    const reachable = reachableHexes({ q: 0, r: 0 }, 3, field, new Set())
    expect(reachable).toContainEqual({ q: 1, r: 0 })
    expect(reachable).toContainEqual({ q: 0, r: 2 })
  })

  it('moves enemies toward their closest target', () => {
    const field = createHexField(7, 4, [])
    const next = shortestStep({ q: 6, r: 2 }, { q: 0, r: 2 }, 2, field, new Set())
    expect(hexDistance(next, { q: 0, r: 2 })).toBeLessThan(6)
  })
})
