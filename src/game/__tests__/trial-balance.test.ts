/** TRIAL=1 npx vitest run src/game/__tests__/trial-balance.test.ts — 間章每關 1★~3★ 自動對打 */
import { describe, it } from "vitest";
import { battleResult } from "../battle";
import { getChapter } from "../chapters";
import { addShards, newSave, recruit } from "../progress";
import { simulate } from "../sim";
import type { SaveState } from "../types";

const run = process.env.TRIAL ? describe : describe.skip;
run("trial balance", () => {
  it("間章", () => {
    const LV = Number(process.env.LV ?? 4);
    let save: SaveState = addShards(newSave("brave"), { mata: 6, kasiw: 6 });
    save = recruit(recruit(save, "mata"), "kasiw");
    for (const id of save.party) {
      const main = ({ batu: "str", danum: "spi", bitu: "int", mata: "agi", kasiw: "vit" } as const)[id as "batu"];
      save.heroes[id] = { ...save.heroes[id], level: LV, unspent: 0, bonus: { ...save.heroes[id].bonus, [main]: (LV - 1) * 3 } };
    }
    const N = Number(process.env.N ?? 8);
    for (const b of getChapter("inter1").battles) {
      const line = [1, 2, 3].map((tier) => {
        let w = 0;
        for (let i = 0; i < N; i++) if (battleResult(simulate(b, save, 50 + i * 13, tier), 8).victory) w++;
        return `${tier}★ ${Math.round((w / N) * 100)}%`;
      });
      console.log(`Lv${LV} ${b.title.padEnd(8)} ${line.join("  ")}`);
    }
  });
});
