import { describe, expect, it } from 'vitest'
import { calculateStars } from '../src/game/progress'

describe('battle rating', () => {
  it('awards no stars for a loss', () => {
    expect(calculateStars(false, 4, 7, 0)).toBe(0)
  })

  it('awards completion, speed, and survival independently', () => {
    expect(calculateStars(true, 5, 7, 0)).toBe(3)
    expect(calculateStars(true, 9, 7, 0)).toBe(2)
    expect(calculateStars(true, 5, 7, 1)).toBe(2)
    expect(calculateStars(true, 9, 7, 1)).toBe(1)
  })
})
