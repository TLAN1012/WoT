/** 美術路徑(public/art/**,由 scripts/art/gen-art.py 以自架畫室生成) */
const BASE = import.meta.env.BASE_URL;

export const portraitArt = (id: string) => `${BASE}art/portraits/${id}.webp`;
export const spriteArt = (id: string) => `${BASE}art/sprites/${id}.webp`;
export const terrainArt = (id: string) => `${BASE}art/terrain/${id}.webp`;
export const storyArt = (id: string) => `${BASE}art/story/${id}.webp`;

/** 原圖朝左的小人(畫的時候要求朝右,但畫室偶爾會畫反;在這裡登記) */
export const SPRITE_FACES_LEFT = new Set<string>([]);
