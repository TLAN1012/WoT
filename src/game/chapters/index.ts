import { CHAPTER_1 } from "./ch1";
import type { BattleDef, ChapterDef } from "../types";

export const CHAPTERS: ChapterDef[] = [CHAPTER_1];

export function findBattle(id: string): { chapter: ChapterDef; battle: BattleDef; index: number } {
  for (const chapter of CHAPTERS) {
    const index = chapter.battles.findIndex((b) => b.id === id);
    if (index >= 0) return { chapter, battle: chapter.battles[index], index };
  }
  throw new Error(`Unknown battle: ${id}`);
}
