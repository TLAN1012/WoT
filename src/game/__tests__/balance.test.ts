/** BALANCE=1 npx vitest run src/game/__tests__/balance.test.ts — 印出各關自動對打勝率 */
import { describe, it } from "vitest";
import { battleResult, living } from "../battle";
import { CHAPTER_1 } from "../chapters/ch1";
import { gainXp, newSave } from "../progress";
import { simulate } from "../sim";
import type { DifficultyId } from "../types";

const run = process.env.BALANCE ? describe : describe.skip;

run("balance", () => {
  for (const diff of ["gentle", "brave", "legend"] as DifficultyId[]) {
    it(diff, () => {
      const N = Number(process.env.N ?? 20);
      let save = newSave(diff);
      for (const b of CHAPTER_1.battles) {
        let wins = 0, turns = 0, fallen = 0, hpLeft = 0;
        const xpSum: Record<string, number> = {};
        for (let i = 0; i < N; i++) {
          const s = simulate(b, save, 1000 + i * 17);
          const r = battleResult(s, b.parTurns);
          if (r.victory) wins++;
          turns += r.turns;
          fallen += r.fallen.length;
          hpLeft += living(s, "enemy").reduce((n, u) => n + u.hp, 0);
          for (const [k, v] of Object.entries(r.xp)) xpSum[k] = (xpSum[k] ?? 0) + v;
        }
        console.log(`${diff} ${b.id} Lv${Object.values(save.heroes).map((h) => h.level).join("/")}: 勝率 ${Math.round((wins / N) * 100)}% 平均 ${(turns / N).toFixed(1)} 回合 倒下 ${(fallen / N).toFixed(2)} 敵剩血 ${(hpLeft / N).toFixed(0)}`);
        // 用平均經驗推進存檔(模擬玩家升級、點數平均投主屬性)
        for (const id of save.party) {
          const g = gainXp(save.heroes[id], Math.round(xpSum[id] / N));
          let h = g.hero;
          const main = id === "batu" ? "str" : id === "danum" ? "spi" : "int";
          while (h.unspent > 0) h = { ...h, unspent: h.unspent - 1, bonus: { ...h.bonus, [main]: h.bonus[main] + 1 } };
          save = { ...save, heroes: { ...save.heroes, [id]: h } };
        }
      }
    });
  }
});
