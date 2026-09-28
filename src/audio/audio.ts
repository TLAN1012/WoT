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

/** 曲尾與下一輪重疊的秒數(循環接縫)、換曲時的淡入淡出秒數 */
const LOOP_XF = 2.5;
const SWITCH_FADE = 1.4;
const MUSIC_VOL = 0.45;

interface Voice {
  id: BgmId;
  gain: GainNode;
  sources: AudioBufferSourceNode[];
  timer?: ReturnType<typeof setTimeout>;
}

class Audio {
  private ctx: AudioContext | null = null;
  private bus: GainNode | null = null;
  private buffers = new Map<BgmId, Promise<AudioBuffer>>();
  private voice: Voice | null = null;
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
      this.bus = this.ctx.createGain();
      this.bus.gain.value = this.muted ? 0 : 1;
      this.bus.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    if (this.wanted && this.voice?.id !== this.wanted) this.playBgm(this.wanted);
  }

  private load(id: BgmId): Promise<AudioBuffer> {
    let p = this.buffers.get(id);
    if (!p) {
      const ctx = this.ctx!;
      p = fetch(TRACKS[id])
        .then((r) => r.arrayBuffer())
        .then((b) => ctx.decodeAudioData(b));
      p.catch(() => this.buffers.delete(id));
      this.buffers.set(id, p);
    }
    return p;
  }

  /** 排一段曲子;循環曲在曲尾前 LOOP_XF 秒排下一段,兩段交叉淡入淡出 */
  private segment(v: Voice, buf: AudioBuffer, when: number, loop: boolean, first: boolean) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    const xf = Math.min(LOOP_XF, buf.duration / 4);
    g.gain.setValueAtTime(first ? 1 : 0, when);
    if (!first) g.gain.linearRampToValueAtTime(1, when + xf);
    if (loop) {
      g.gain.setValueAtTime(1, when + buf.duration - xf);
      g.gain.linearRampToValueAtTime(0, when + buf.duration);
    }
    src.connect(g).connect(v.gain);
    src.start(when);
    v.sources = [...v.sources.slice(-1), src];
    if (loop) {
      const next = when + buf.duration - xf;
      v.timer = setTimeout(() => {
        if (this.voice === v) this.segment(v, buf, next, true, false);
      }, Math.max(0, (next - ctx.currentTime - 1) * 1000));
    }
  }

  playBgm(id: BgmId) {
    this.wanted = id;
    const ctx = this.ctx;
    if (!ctx || !this.bus) return; // 等使用者第一次點擊
    if (this.voice?.id === id) return;
    // 舊曲淡出
    const old = this.voice;
    if (old) {
      clearTimeout(old.timer);
      const t = ctx.currentTime;
      old.gain.gain.cancelScheduledValues(t);
      old.gain.gain.setValueAtTime(old.gain.gain.value, t);
      old.gain.gain.linearRampToValueAtTime(0, t + SWITCH_FADE);
      setTimeout(() => old.sources.forEach((s) => s.stop()), SWITCH_FADE * 1000 + 100);
    }
    const v: Voice = { id, gain: ctx.createGain(), sources: [] };
    v.gain.gain.value = 0;
    v.gain.connect(this.bus);
    this.voice = v;
    void this.load(id).then((buf) => {
      if (this.voice !== v) return;
      const t = ctx.currentTime + 0.05;
      // 新曲淡入(和舊曲的淡出重疊)
      v.gain.gain.setValueAtTime(0, t);
      v.gain.gain.linearRampToValueAtTime(MUSIC_VOL, t + SWITCH_FADE);
      this.segment(v, buf, t, id === "camp" || id === "battle", true);
    });
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.ctx && this.bus) this.bus.gain.setTargetAtTime(this.muted ? 0 : 1, this.ctx.currentTime, 0.1);
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
// 除錯用:在主控台看目前播放的曲目
(globalThis as { __wotAudio?: Audio }).__wotAudio = audio;
