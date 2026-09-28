import { it } from "vitest";
import { findBattle } from "../chapters";
import { newSave } from "../progress";
import { simulate } from "../sim";
const run = process.env.TRACE ? it : it.skip;
run("trace", () => {
  const { battle } = findBattle(process.env.TRACE!);
  const save = newSave((process.env.DIFF as "brave") ?? "brave");
  const lv = Number(process.env.LV ?? 1);
  for (const id of save.party) save.heroes[id] = { ...save.heroes[id], level: lv };
  const s = simulate(battle, save, 7);
  console.log(s.log.filter((e) => e.kind !== "info" || e.text.includes("回合")).map((e) => `${e.turn} ${e.text}`).join("\n"));
  console.log(s.units.filter((u) => u.isHero).map((u) => `${u.name} ${u.hp}/${u.maxHp} atk${u.atk} mag${u.mag} def${u.def}`).join("\n"));
});
