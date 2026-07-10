import type { Role } from './types'

export type AudioEffect = 'select' | 'move' | 'hit' | 'ability' | 'victory' | 'defeat'
export type MusicMode = 'campaign' | 'battle'

const VOICE_PITCH: Record<string, number> = {
  yao: 112,
  sora: 196,
  mei: 174,
  taka: 148,
  ember_raider: 126,
  salt_archer: 166,
  mire_guard: 92,
  cannoner: 104,
  commander: 82,
}

const SELECT_NOTES: Record<string, [number, number]> = {
  yao: [196, 293.7],
  sora: [329.6, 440],
  mei: [261.6, 392],
  taka: [293.7, 493.9],
}

export class AudioDirector {
  private context?: AudioContext
  private master?: GainNode
  private musicBus?: GainNode
  private effectsBus?: GainNode
  private musicTimer?: number
  private pendingMusic?: MusicMode
  private musicMode?: MusicMode
  private nextStepTime = 0
  private step = 0
  private muted = false
  private noiseBuffer?: AudioBuffer
  private lastCue = ''

  async unlock(): Promise<void> {
    if (!this.context) {
      this.context = new AudioContext()
      const compressor = this.context.createDynamicsCompressor()
      compressor.threshold.value = -18
      compressor.knee.value = 14
      compressor.ratio.value = 5
      compressor.attack.value = 0.006
      compressor.release.value = 0.22

      this.master = this.context.createGain()
      this.master.gain.value = this.muted ? 0 : 0.62
      this.musicBus = this.context.createGain()
      this.musicBus.gain.value = 0.34
      this.effectsBus = this.context.createGain()
      this.effectsBus.gain.value = 0.78
      this.musicBus.connect(compressor)
      this.effectsBus.connect(compressor)
      compressor.connect(this.master)
      this.master.connect(this.context.destination)
      this.noiseBuffer = this.createNoiseBuffer()
    }
    if (this.context.state === 'suspended') await this.context.resume()
    if (this.pendingMusic) this.beginMusic(this.pendingMusic)
  }

  setMuted(muted: boolean): void {
    this.muted = muted
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.62, this.context.currentTime, 0.05)
    }
  }

  isMuted(): boolean {
    return this.muted
  }

  getLastCue(): string {
    return this.lastCue
  }

  startMusic(mode: MusicMode): void {
    this.pendingMusic = mode
    if (!this.context || !this.musicBus) return
    this.beginMusic(mode)
  }

  stopMusic(): void {
    if (this.musicTimer !== undefined) window.clearInterval(this.musicTimer)
    this.musicTimer = undefined
    this.musicMode = undefined
    this.pendingMusic = undefined
  }

  playSelect(unitId?: string): void {
    this.lastCue = `select:${unitId ?? 'ui'}`
    if (!this.context || !this.effectsBus || this.muted) return
    const notes = (unitId && SELECT_NOTES[unitId]) || [440, 554.4]
    const now = this.context.currentTime
    this.pluck(notes[0], now, 0.11, 0.075, this.effectsBus)
    this.pluck(notes[1], now + 0.055, 0.13, 0.055, this.effectsBus)
  }

  playAttack(unitId: string, role: Role, ability = false): void {
    this.lastCue = `attack:${unitId}:${role}${ability ? ':ability' : ''}`
    if (!this.context || !this.effectsBus || this.muted) return
    const now = this.context.currentTime
    this.battleCry(VOICE_PITCH[unitId] ?? 125, now, unitId === 'commander' ? 0.34 : 0.24)
    const impactTime = now + (role === 'artillery' ? 0.22 : 0.15)

    if (role === 'ranger') this.bowShot(impactTime)
    else if (role === 'artillery') this.cannonShot(impactTime)
    else if (role === 'mystic') this.magicStrike(impactTime)
    else this.meleeStrike(impactTime, role === 'vanguard' || role === 'commander')

    if (ability) {
      this.tone(392, 0.25, 'triangle', 0.08, now + 0.08, this.effectsBus, 659)
    }
  }

  play(effect: AudioEffect): void {
    this.lastCue = effect
    if (!this.context || !this.effectsBus || this.muted) return
    const now = this.context.currentTime
    if (effect === 'select') {
      this.playSelect()
    } else if (effect === 'move') {
      this.noise(0.085, 0.055, now, 780)
      this.tone(150, 0.09, 'triangle', 0.065, now, this.effectsBus, 112)
    } else if (effect === 'hit') {
      this.meleeStrike(now, false)
    } else if (effect === 'ability') {
      this.magicStrike(now)
      this.tone(330, 0.26, 'triangle', 0.08, now, this.effectsBus, 494)
    } else if (effect === 'victory') {
      ;[392, 523.3, 659.3, 784].forEach((note, index) => this.horn(note, now + index * 0.12, index === 3 ? 0.5 : 0.23, 0.1))
      this.taiko(now, 0.16)
    } else {
      ;[196, 174.6, 146.8, 110].forEach((note, index) => this.horn(note, now + index * 0.15, 0.3, 0.075))
      this.noise(0.7, 0.035, now + 0.2, 260)
    }
  }

  private beginMusic(mode: MusicMode): void {
    if (!this.context) return
    if (this.musicTimer !== undefined) window.clearInterval(this.musicTimer)
    this.musicMode = mode
    this.pendingMusic = mode
    this.step = 0
    this.nextStepTime = this.context.currentTime + 0.04
    this.scheduleMusic()
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 50)
  }

  private scheduleMusic(): void {
    if (!this.context || !this.musicMode) return
    if (this.muted) {
      this.nextStepTime = this.context.currentTime + 0.05
      return
    }
    const secondsPerStep = 60 / (this.musicMode === 'battle' ? 116 : 82) / 4
    while (this.nextStepTime < this.context.currentTime + 0.18) {
      if (this.musicMode === 'battle') this.scheduleBattleStep(this.step, this.nextStepTime)
      else this.scheduleCampaignStep(this.step, this.nextStepTime)
      this.step += 1
      this.nextStepTime += secondsPerStep
    }
  }

  private scheduleBattleStep(step: number, when: number): void {
    if (!this.musicBus) return
    const beat = step % 16
    const phrase = Math.floor(step / 16) % 4
    const bass = [73.42, 73.42, 87.31, 69.3][phrase]
    if (beat % 4 === 0) {
      this.tone(bass, 0.22, 'triangle', 0.07, when, this.musicBus, bass * 0.92)
      this.taiko(when, beat === 0 ? 0.1 : 0.072)
    }
    if (beat === 4 || beat === 12) this.snare(when, 0.035)
    if (beat % 2 === 1) this.shaker(when, beat % 4 === 3 ? 0.019 : 0.012)

    const melody: Array<number | undefined> = [
      undefined, undefined, 293.7, undefined,
      349.2, undefined, 392, undefined,
      undefined, 440, undefined, 392,
      349.2, undefined, 311.1, undefined,
    ]
    const note = melody[(beat + phrase * 2) % melody.length]
    if (note) this.pluck(note, when, 0.16, 0.034, this.musicBus)
    if (beat === 0 && phrase % 2 === 0) this.horn(146.8, when, 0.72, 0.026)
  }

  private scheduleCampaignStep(step: number, when: number): void {
    if (!this.musicBus) return
    const beat = step % 32
    const phrase = Math.floor(step / 32) % 4
    const roots = [73.42, 87.31, 65.41, 73.42]
    const root = roots[phrase]
    if (beat === 0 || beat === 16) {
      this.horn(root, when, 1.4, 0.025)
      this.tone(root / 2, 1.1, 'sine', 0.035, when, this.musicBus)
      this.taiko(when, 0.045)
    }
    if (beat === 8 || beat === 24) this.taiko(when, 0.028)
    const melody: Array<number | undefined> = [
      293.7, undefined, undefined, undefined, 349.2, undefined, 392, undefined,
      undefined, undefined, 440, undefined, 392, undefined, 349.2, undefined,
      261.6, undefined, undefined, undefined, 293.7, undefined, 349.2, undefined,
      undefined, 392, undefined, 349.2, undefined, 293.7, undefined, undefined,
    ]
    const note = melody[(beat + phrase * 4) % melody.length]
    if (note) this.pluck(note, when, 0.42, 0.028, this.musicBus)
  }

  private battleCry(pitch: number, when: number, duration: number): void {
    if (!this.context || !this.effectsBus) return
    const source = this.context.createOscillator()
    const rasp = this.context.createOscillator()
    const formantLow = this.context.createBiquadFilter()
    const formantHigh = this.context.createBiquadFilter()
    const voiceGain = this.context.createGain()
    const now = Math.max(when, this.context.currentTime)

    source.type = 'sawtooth'
    rasp.type = 'triangle'
    source.frequency.setValueAtTime(pitch * 0.86, now)
    source.frequency.exponentialRampToValueAtTime(pitch * 1.1, now + duration * 0.32)
    source.frequency.exponentialRampToValueAtTime(pitch * 0.7, now + duration)
    rasp.frequency.setValueAtTime(pitch * 2.02, now)
    rasp.frequency.exponentialRampToValueAtTime(pitch * 1.35, now + duration)
    formantLow.type = 'bandpass'
    formantLow.frequency.value = 720
    formantLow.Q.value = 4.5
    formantHigh.type = 'bandpass'
    formantHigh.frequency.value = 1320
    formantHigh.Q.value = 5.2
    voiceGain.gain.setValueAtTime(0.001, now)
    voiceGain.gain.exponentialRampToValueAtTime(0.13, now + 0.025)
    voiceGain.gain.setValueAtTime(0.1, now + duration * 0.55)
    voiceGain.gain.exponentialRampToValueAtTime(0.001, now + duration)
    source.connect(formantLow)
    rasp.connect(formantHigh)
    formantLow.connect(voiceGain)
    formantHigh.connect(voiceGain)
    voiceGain.connect(this.effectsBus)
    source.start(now)
    rasp.start(now)
    source.stop(now + duration + 0.02)
    rasp.stop(now + duration + 0.02)
    this.noise(duration * 0.75, 0.028, now, 980)
  }

  private meleeStrike(when: number, heavy: boolean): void {
    if (!this.effectsBus) return
    this.noise(heavy ? 0.24 : 0.14, heavy ? 0.12 : 0.08, when, heavy ? 240 : 520)
    this.tone(heavy ? 72 : 105, heavy ? 0.25 : 0.15, 'sine', heavy ? 0.16 : 0.11, when, this.effectsBus, 48)
    this.tone(heavy ? 820 : 1180, 0.09, 'square', 0.025, when, this.effectsBus, heavy ? 420 : 680)
  }

  private bowShot(when: number): void {
    if (!this.effectsBus) return
    this.tone(240, 0.08, 'triangle', 0.085, when, this.effectsBus, 92)
    this.noise(0.18, 0.06, when + 0.015, 1800)
    this.tone(1320, 0.12, 'sine', 0.03, when + 0.02, this.effectsBus, 620)
  }

  private cannonShot(when: number): void {
    if (!this.effectsBus) return
    this.tone(82, 0.48, 'sine', 0.18, when, this.effectsBus, 38)
    this.noise(0.55, 0.15, when, 180)
    this.noise(0.24, 0.07, when + 0.05, 920)
  }

  private magicStrike(when: number): void {
    if (!this.effectsBus) return
    this.noise(0.34, 0.055, when, 1450)
    this.tone(220, 0.38, 'sine', 0.075, when, this.effectsBus, 660)
    this.tone(329.6, 0.32, 'triangle', 0.05, when + 0.035, this.effectsBus, 987.8)
  }

  private taiko(when: number, volume: number): void {
    if (!this.musicBus) return
    this.tone(105, 0.27, 'sine', volume, when, this.musicBus, 43)
    this.noise(0.11, volume * 0.4, when, 190, this.musicBus)
  }

  private snare(when: number, volume: number): void {
    if (!this.musicBus) return
    this.noise(0.12, volume, when, 1350, this.musicBus)
    this.tone(178, 0.07, 'triangle', volume * 0.6, when, this.musicBus, 122)
  }

  private shaker(when: number, volume: number): void {
    if (!this.musicBus) return
    this.noise(0.045, volume, when, 4800, this.musicBus)
  }

  private horn(frequency: number, when: number, duration: number, volume: number): void {
    if (!this.context || !this.musicBus) return
    const oscillator = this.context.createOscillator()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    oscillator.type = 'sawtooth'
    oscillator.frequency.value = frequency
    oscillator.detune.value = -5
    filter.type = 'lowpass'
    filter.frequency.value = 880
    filter.Q.value = 1.2
    gain.gain.setValueAtTime(0.001, when)
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.06)
    gain.gain.setValueAtTime(volume * 0.72, when + duration * 0.62)
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration)
    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(this.musicBus)
    oscillator.start(when)
    oscillator.stop(when + duration + 0.02)
  }

  private pluck(frequency: number, when: number, duration: number, volume: number, destination: AudioNode): void {
    if (!this.context) return
    const oscillator = this.context.createOscillator()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.value = frequency
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(2200, when)
    filter.frequency.exponentialRampToValueAtTime(520, when + duration)
    gain.gain.setValueAtTime(0.001, when)
    gain.gain.exponentialRampToValueAtTime(volume, when + 0.008)
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration)
    oscillator.connect(filter)
    filter.connect(gain)
    gain.connect(destination)
    oscillator.start(when)
    oscillator.stop(when + duration + 0.02)
  }

  private tone(
    frequency: number,
    duration: number,
    type: OscillatorType,
    volume: number,
    when: number,
    destination: AudioNode,
    endFrequency?: number,
  ): void {
    if (!this.context) return
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(frequency, when)
    if (endFrequency) oscillator.frequency.exponentialRampToValueAtTime(endFrequency, when + duration)
    gain.gain.setValueAtTime(0.001, when)
    gain.gain.exponentialRampToValueAtTime(volume, when + Math.min(0.015, duration * 0.2))
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration)
    oscillator.connect(gain)
    gain.connect(destination)
    oscillator.start(when)
    oscillator.stop(when + duration + 0.02)
  }

  private noise(duration: number, volume: number, when: number, frequency: number, destination = this.effectsBus): void {
    if (!this.context || !this.noiseBuffer || !destination) return
    const source = this.context.createBufferSource()
    const filter = this.context.createBiquadFilter()
    const gain = this.context.createGain()
    source.buffer = this.noiseBuffer
    filter.type = 'bandpass'
    filter.frequency.value = frequency
    filter.Q.value = frequency > 1000 ? 0.75 : 1.2
    gain.gain.setValueAtTime(volume, when)
    gain.gain.exponentialRampToValueAtTime(0.001, when + duration)
    source.connect(filter)
    filter.connect(gain)
    gain.connect(destination)
    source.start(when)
    source.stop(when + duration + 0.02)
  }

  private createNoiseBuffer(): AudioBuffer {
    const context = this.context!
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1
    return buffer
  }
}

export const audioDirector = new AudioDirector()
