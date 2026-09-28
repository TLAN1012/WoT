/**
 * 試煉關卡的地圖產生器:依主題(海岸、河流、潟湖、丘陵、森林、岬角)用固定種子產生手繪風格的字元地圖。
 * 同一個種子永遠產生同一張圖;產生後保證出發區到每個敵人都走得到。
 */
import type { Cell } from "../types";

export type Theme = "coast" | "river" | "lagoon" | "hill" | "forest" | "cape" | "snow" | "grass";

export const W = 14;
export const H = 10;

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE: Record<Theme, { base: string; blobs: Array<[string, number, number]> }> = {
  // [字元, 團數, 每團大小]
  coast: { base: "g", blobs: [["b", 4, 6], ["C", 2, 5], ["J", 2, 5], ["R", 1, 2]] },
  river: { base: "g", blobs: [["J", 4, 6], ["b", 1, 3], ["R", 1, 2]] },
  lagoon: { base: "g", blobs: [["m", 3, 6], ["=", 3, 4], ["b", 2, 5], ["J", 1, 4]] },
  hill: { base: "g", blobs: [["C", 4, 7], ["R", 2, 3], ["J", 2, 5]] },
  forest: { base: "J", blobs: [["g", 5, 7], ["R", 1, 2], ["m", 1, 3]] },
  cape: { base: "C", blobs: [["b", 3, 6], ["g", 3, 6], ["R", 2, 2]] },
  snow: { base: "*", blobs: [[".", 4, 7], ["T", 3, 6], ["i", 1, 4], ["R", 1, 2]] },
  grass: { base: "g", blobs: [["J", 2, 4], [".", 2, 5], ["C", 1, 4], ["R", 1, 2]] },
};

const IMPASSABLE = new Set(["~", "R"]);

/** offset 鄰居(與 cellToHex 的 axial 換算一致:odd-r) */
function neighbors([c, r]: Cell): Cell[] {
  const odd = r % 2 === 1;
  const d = odd
    ? [[1, 0], [-1, 0], [0, -1], [1, -1], [0, 1], [1, 1]]
    : [[1, 0], [-1, 0], [-1, -1], [0, -1], [-1, 1], [0, 1]];
  return d.map(([dc, dr]) => [c + dc, r + dr] as Cell).filter(([x, y]) => x >= 0 && y >= 0 && x < W && y < H);
}

export interface GenMap {
  rows: string[];
  deploy: Cell[];
  heroes: Cell[];
  /** 東側可以放敵人的格子(依種子排序) */
  spots: Cell[];
  /** 最東邊的一條可走格(「抵達」目標用) */
  goal: Cell[];
}

export function generateMap(theme: Theme, seed: number): GenMap {
  const rand = rng(seed);
  const g: string[][] = Array.from({ length: H }, () => Array(W).fill(PALETTE[theme].base));
  const set = (c: number, r: number, ch: string) => c >= 0 && r >= 0 && c < W && r < H && (g[r][c] = ch);

  for (const [ch, n, size] of PALETTE[theme].blobs) {
    for (let i = 0; i < n; i++) {
      let cell: Cell = [Math.floor(rand() * W), Math.floor(rand() * H)];
      for (let k = 0; k < size; k++) {
        set(cell[0], cell[1], ch);
        const ns = neighbors(cell);
        cell = ns[Math.floor(rand() * ns.length)];
      }
    }
  }
  if (theme === "river") {
    // 一條蜿蜒的淺灘河由北往南
    let c = 6 + Math.floor(rand() * 2);
    for (let r = 0; r < H; r++) {
      set(c, r, "=");
      if (rand() < 0.5) set(c + 1, r, "=");
      c = Math.max(5, Math.min(8, c + (rand() < 0.33 ? -1 : rand() < 0.5 ? 1 : 0)));
    }
  }
  if (theme === "coast" || theme === "cape") {
    // 南邊(與岬角的東南角)是海
    for (let c = 0; c < W; c++) {
      set(c, H - 1, "~");
      if (rand() < 0.5) set(c, H - 2, "b");
    }
    if (theme === "cape") for (let r = 6; r < H; r++) for (let c = W - 3 + (r % 2); c < W; c++) set(c, r, "~");
  }
  // 出發區(西側)一律草地/沙灘
  const deploy: Cell[] = [];
  for (let r = 2; r <= 7; r++) for (let c = 1; c <= 3; c++) {
    if (!IMPASSABLE.has(g[r][c]) && g[r][c] !== "=") deploy.push([c, r]);
    else {
      set(c, r, theme === "coast" || theme === "cape" ? "b" : theme === "snow" ? "." : "g");
      deploy.push([c, r]);
    }
  }
  // 敵人候選格(東側)
  const east: Cell[] = [];
  for (let r = 0; r < H; r++) for (let c = 9; c <= 12; c++) if (!IMPASSABLE.has(g[r][c])) east.push([c, r]);
  for (let i = east.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [east[i], east[j]] = [east[j], east[i]];
  }
  // 連通:從出發區走不到的東側格,沿直線把障礙開成草地
  const reach = () => {
    const seen = new Set<string>(["2,4"]);
    const q: Cell[] = [[2, 4]];
    while (q.length) {
      const cur = q.shift()!;
      for (const n of neighbors(cur)) {
        const k = `${n[0]},${n[1]}`;
        if (!seen.has(k) && !IMPASSABLE.has(g[n[1]][n[0]])) {
          seen.add(k);
          q.push(n);
        }
      }
    }
    return seen;
  };
  let seen = reach();
  for (const [c, r] of east) {
    if (seen.has(`${c},${r}`)) continue;
    for (let x = 3; x <= c; x++) if (IMPASSABLE.has(g[r][x])) set(x, r, theme === "snow" ? "." : "g");
    seen = reach();
  }
  const spots = east.filter(([c, r]) => seen.has(`${c},${r}`));
  const goal: Cell[] = [];
  for (let r = 0; r < H; r++) {
    for (let c = W - 1; c >= W - 3; c--) {
      if (seen.has(`${c},${r}`)) {
        goal.push([c, r]);
        break;
      }
    }
  }
  return { rows: g.map((row) => row.join("")), deploy, heroes: [[3, 4], [2, 3], [2, 5], [1, 4]], spots, goal };
}
