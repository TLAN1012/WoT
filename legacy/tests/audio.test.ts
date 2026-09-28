import { describe, expect, it } from 'vitest'
import { AudioDirector } from '../src/game/audio'

describe('audio cues', () => {
  it('identifies character selection cues before Web Audio is unlocked', () => {
    const audio = new AudioDirector()
    audio.playSelect('yao')
    expect(audio.getLastCue()).toBe('select:yao')
  })

  it('identifies the attacker, weapon role, and ability attacks', () => {
    const audio = new AudioDirector()
    audio.playAttack('sora', 'ranger')
    expect(audio.getLastCue()).toBe('attack:sora:ranger')

    audio.playAttack('commander', 'commander', true)
    expect(audio.getLastCue()).toBe('attack:commander:commander:ability')
  })

  it('keeps music mute state explicit', () => {
    const audio = new AudioDirector()
    audio.setMuted(true)
    expect(audio.isMuted()).toBe(true)
    audio.setMuted(false)
    expect(audio.isMuted()).toBe(false)
  })
})
