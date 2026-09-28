/**
 * 音樂:沿用 WoT 原創的四首 MP3(營地、戰鬥、勝利、撤退);
 * 音效:WebAudio 即時合成(斧擊、法術、治療、倒下)。首次點擊後才能出聲(瀏覽器政策)。
 */
const BASE = import.meta.env.BASE_URL;
const TRACKS = {
  camp: `${BASE}assets/audio/Banner_of_Takao.mp3`,
  battle: `${BASE}assets/audio/Frontline_Calculations.mp3`,
  victory: `${BASE}assets/audio/Victory_Over_Takao.mp3`,
  defeat: `${BASE}assets/audio/Failed_war.mp3`,
} as const;
export type BgmId = keyof typeof TRACKS;
export type SfxId = "hit" | "magic" | "heal" | "down" | "select" | "move";

const MUTE_KEY = "wot-muted";

class Audio {
  private ctx: AudioContext | null = null;
  private el: HTMLAudioElement | null = null;
  private current: BgmId | null = null;
  private wanted: BgmId | null = null;
  muted = (() => {
    try {
      return localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      return false;
    }
  })();

  unlock() {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
      } catch {
        return;
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (this.wanted && this.current !== this.wanted) this.playBgm(this.wanted);
  }

  playBgm(id: BgmId) {
    this.wanted = id;
    if (this.current === id && this.el && !this.el.paused) return;
    if (!this.ctx) return; // 等使用者第一次點擊
    this.el?.pause();
    const el = new window.Audio(TRACKS[id]);
    el.loop = id === "camp" || id === "battle";
    el.volume = 0.45;
    el.muted = this.muted;
    void el.play().catch(() => undefined);
    this.el = el;
    this.current = id;
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.el) this.el.muted = this.muted;
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? "1" : "0");
    } catch {
      /* noop */
    }
    return this.muted;
  }

  sfx(id: SfxId) {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.connect(ctx.destination);
    const tone = (type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0) => {
      const o = ctx.createOscillator();
      const gg = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t + delay);
      o.frequency.exponentialRampToValueAtTime(f1, t + delay + dur);
      gg.gain.setValueAtTime(vol, t + delay);
      gg.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
      o.connect(gg).connect(g);
      o.start(t + delay);
      o.stop(t + delay + dur + 0.02);
    };
    const noise = (dur: number, vol: number, freq: number) => {
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = freq;
      const gg = ctx.createGain();
      gg.gain.value = vol;
      src.connect(f).connect(gg).connect(g);
      src.start(t);
    };
    switch (id) {
      case "hit":
        noise(0.18, 0.5, 900);
        tone("triangle", 140, 60, 0.18, 0.35);
        break;
      case "magic":
        tone("sine", 880, 1760, 0.25, 0.12);
        tone("triangle", 1320, 660, 0.35, 0.08, 0.05);
        noise(0.3, 0.12, 4000);
        break;
      case "heal":
        [523, 659, 784].forEach((f, i) => tone("sine", f, f * 1.01, 0.4, 0.1, i * 0.08));
        break;
      case "down":
        tone("sawtooth", 220, 55, 0.6, 0.12);
        break;
      case "select":
        tone("sine", 660, 880, 0.08, 0.08);
        break;
      case "move":
        noise(0.12, 0.15, 500);
        break;
    }
  }
}

export const audio = new Audio();
