/**
 * 手繪地圖:每列一個字串、每個字元一格(字元對照見 terrain.ts)。
 * 劇本座標用 offset「欄, 列」(Cell);引擎內部一律 axial (q, r),q = 欄 − floor(列/2)。
 */
import { hexKey, type Hex } from "../engine/hex";
import { TERRAIN_BY_CHAR } from "./terrain";
import type { Cell } from "./types";

export function cellToHex([col, row]: Cell): Hex {
  return { q: col - Math.floor(row / 2), r: row };
}

export function hexToCell(h: Hex): Cell {
  return [h.q + Math.floor(h.r / 2), h.r];
}

export function parseMap(rows: string[]): Record<string, string> {
  const width = rows[0]?.length ?? 0;
  const terrain: Record<string, string> = {};
  rows.forEach((line, row) => {
    if (line.length !== width) throw new Error(`地圖第 ${row} 列長度 ${line.length} ≠ ${width}`);
    [...line].forEach((ch, col) => {
      const t = TERRAIN_BY_CHAR.get(ch);
      if (!t) throw new Error(`地圖第 ${row} 列第 ${col} 欄:不認得的字元「${ch}」`);
      terrain[hexKey(cellToHex([col, row]))] = t.id;
    });
  });
  return terrain;
}
