export class AudioDirector {
  private context?: AudioContext
  private master?: GainNode
  private musicTimer?: number
  private step = 0
  private muted = false

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext()
      this.master = this.context.createGain()
      this.master.gain.value = 0.18
      this.master.connect(this.context.destination)
    }
    if (this.context.state === 'suspended') await this.context.resume()
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.18, this.context.currentTime, 0.08)
    }
  }

  isMuted(): boolean {
    return this.muted
  }

  startMusic(mode: 'campaign' | 'battle'): void {
    this.stopMusic()
    const notes = mode === 'battle' ? [110, 146.8, 164.8, 220, 196, 164.8] : [146.8, 174.6, 220, 196, 174.6, 130.8]
    const tempo = mode === 'battle' ? 330 : 560
    this.step = 0
    this.musicTimer = window.setInterval(() => {
      if (!this.context || this.muted) return
      const frequency = notes[this.step % notes.length]
      this.tone(frequency, mode === 'battle' ? 0.22 : 0.42, mode === 'battle' ? 'sawtooth' : 'triangle', 0.055)
      if (this.step % 2 === 0) this.tone(frequency / 2, 0.18, 'sine', 0.035)
      this.step += 1
    }, tempo)
  }

  stopMusic(): void {
    if (this.musicTimer) window.clearInterval(this.musicTimer)
    this.musicTimer = undefined
  }

  play(effect: 'select' | 'move' | 'hit' | 'ability' | 'victory' | 'defeat'): void {
    if (!this.context || this.muted) return
    const patterns: Record<typeof effect, Array<[number, number, OscillatorType]>> = {
      select: [[440, 0.06, 'sine']],
      move: [[180, 0.08, 'triangle']],
      hit: [[90, 0.12, 'square'], [65, 0.16, 'sawtooth']],
      ability: [[330, 0.12, 'triangle'], [494, 0.2, 'sine']],
      victory: [[392, 0.16, 'triangle'], [523, 0.18, 'triangle'], [659, 0.34, 'sine']],
      defeat: [[196, 0.2, 'sawtooth'], [147, 0.38, 'triangle']],
    }
    let offset = 0
    for (const [frequency, duration, type] of patterns[effect]) {
      window.setTimeout(() => this.tone(frequency, duration, type, 0.12), offset)
      offset += duration * 650
    }
  }

  private tone(frequency: number, duration: number, type: OscillatorType, volume: number): void {
    if (!this.context || !this.master) return
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    const now = this.context.currentTime
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, now)
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.015)
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    oscillator.connect(gain)
    gain.connect(this.master)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.02)
  }
}

export const audioDirector = new AudioDirector()
