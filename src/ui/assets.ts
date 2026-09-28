/** 美術路徑(public/art/**,由 scripts/art/gen-art.py 以自架畫室生成) */
const BASE = import.meta.env.BASE_URL;

/** 祖名傳承:第二代起英雄換成後代的樣子(同名、不同人) */
const HEIR_ART: Record<number, Set<string>> = {
  2: new Set(["batu", "danum", "bitu", "mata", "kasiw", "bulan"]),
};
let generation = 1;
export function setArtGeneration(g: number) {
  generation = g;
}
function heirId(id: string): string {
  for (let g = generation; g >= 2; g--) if (HEIR_ART[g]?.has(id)) return `${id}-g${g}`;
  return id;
}

export const portraitArt = (id: string) => `${BASE}art/portraits/${heirId(id)}.webp`;
export const spriteArt = (id: string) => `${BASE}art/sprites/${heirId(id)}.webp`;
export const terrainArt = (id: string) => `${BASE}art/terrain/${id}.webp`;
export const storyArt = (id: string) => `${BASE}art/story/${id}.webp`;

/** 原圖朝左的小人(畫的時候要求朝右,但畫室偶爾會畫反;在這裡登記) */
export const SPRITE_FACES_LEFT = new Set<string>([]);
export const keepsakeArt = (id: string) => `${BASE}art/keepsakes/${id}.webp`;
