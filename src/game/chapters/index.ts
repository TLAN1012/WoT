import { CHAPTER_1 } from "./ch1";
import { CHAPTER_2 } from "./ch2";
import { INTERLUDE } from "./interlude";
import type { BattleDef, ChapterDef } from "../types";

export const CHAPTERS: ChapterDef[] = [CHAPTER_1, INTERLUDE, CHAPTER_2];

export function getChapter(id: string): ChapterDef {
  return CHAPTERS.find((c) => c.id === id) ?? CHAPTERS[0];
}

/** 前一章全破才開放 */
export function chapterUnlocked(ch: ChapterDef, stars: Record<string, number>): boolean {
  if (!ch.requires) return true;
  return getChapter(ch.requires).battles.every((b) => (stars[b.id] ?? 0) > 0);
}

export function findBattle(id: string): { chapter: ChapterDef; battle: BattleDef; index: number } {
  for (const chapter of CHAPTERS) {
    const index = chapter.battles.findIndex((b) => b.id === id);
    if (index >= 0) return { chapter, battle: chapter.battles[index], index };
  }
  throw new Error(`Unknown battle: ${id}`);
}
