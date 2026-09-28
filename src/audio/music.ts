/**
 * 配樂目錄 — 每個段落兩首不同風格(A/B),由自架 ACE-Step 1.5 生成(~/ace-step/wot_bgm_batch.py)。
 * 預設依場合選曲(關卡可以指定),玩家也能在「音樂室」把某段固定成 A 或 B。
 *
 * 「多聲部人聲吟唱」只取無伴奏、層疊人聲的形式,並非模仿布農族祈禱小米豐收歌(Pasibutbut)——那是神聖祭歌。
 */
const BASE = import.meta.env.BASE_URL;

export type MusicSlot = "theme" | "story" | "battle" | "boss" | "victory" | "defeat";
export type Variant = "a" | "b";

export const MUSIC: Array<{ slot: MusicSlot; name: string; use: string; a: string; b: string }> = [
  { slot: "theme", name: "主題曲", use: "標題、地圖", a: "吉卜力管弦:長笛、豎琴、弦樂", b: "日本陽音階:尺八、箏、輕太鼓" },
  { slot: "story", name: "劇情", use: "對話場景", a: "陶笛與拇指琴、柔和弦樂", b: "多聲部無伴奏人聲吟唱" },
  { slot: "battle", name: "戰鬥", use: "一般戰鬥", a: "太平洋島嶼打擊樂:木鼓、竹筒、海螺", b: "太鼓與尺八,日本音階" },
  { slot: "boss", name: "首領戰", use: "神獸與首領", a: "黑暗史詩合唱與太鼓", b: "原始吟唱與低沉大鼓" },
  { slot: "victory", name: "勝利", use: "結算", a: "管弦號角", b: "竹管、木鼓與歡呼吟唱" },
  { slot: "defeat", name: "撤退", use: "結算", a: "孤獨的長笛", b: "都節音階的箏與尺八" },
];

export const trackUrl = (id: string) => `${BASE}assets/audio/bgm/${id}.mp3`;
/** 勝利/撤退是短曲、只播一次 */
export const trackLoops = (id: string) => !id.startsWith("victory") && !id.startsWith("defeat");

const PREF_KEY = "wot-music-pref";

export function loadPrefs(): Partial<Record<MusicSlot, Variant>> {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function savePref(slot: MusicSlot, v: Variant | null) {
  const p = loadPrefs();
  if (v) p[slot] = v;
  else delete p[slot];
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify(p));
  } catch {
    /* noop */
  }
}

/** 場合 → 曲目 id;玩家在音樂室固定過的以玩家為準,否則用場景指定(預設 A) */
export function pickTrack(slot: MusicSlot, sceneDefault: Variant = "a"): string {
  return `${slot}-${loadPrefs()[slot] ?? sceneDefault}`;
}
