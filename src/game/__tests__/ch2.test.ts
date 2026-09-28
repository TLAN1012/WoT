import { describe, expect, it } from "vitest";
import { battleReducer, getUnit, initFight, living } from "../battle";
import { chapterUnlocked, getChapter } from "../chapters";
import { hexKey } from "../../engine/hex";
import { cellToHex } from "../maps";
import { addShards, inherit, newSave, recruit } from "../progress";
import type { BattleState } from "../types";

const CH2 = getChapter("ch2");
const [T1] = CH2.battles;

describe("第二景", () => {
  it("第一景全破才開放", () => {
    expect(chapterUnlocked(CH2, {})).toBe(false);
    expect(chapterUnlocked(CH2, { "c1-shore": 1, "c1-basalt": 1, "c1-blight": 2 })).toBe(true);
  });

  it("祖名傳承:等級保留一半(至少 2)、點數全退、信物保留、只傳一次", () => {
    let s = newSave("brave");
    s = { ...s, heroes: { ...s.heroes, batu: { ...s.heroes.batu, level: 5, xp: 40, bonus: { str: 6, agi: 0, int: 0, spi: 0, vit: 6 }, unspent: 0 } }, inventory: [{ uid: "k1", id: "conch" }] };
    const g = inherit(s, 2);
    expect(g.generation).toBe(2);
    expect(g.heroes.batu.level).toBe(3);
    expect(g.heroes.batu.bonus.str).toBe(0);
    expect(g.heroes.batu.unspent).toBe(6);
    expect(g.heroes.danum.level).toBe(2);
    expect(g.inventory).toHaveLength(1);
    expect(inherit(g, 2)).toBe(g);
  });

  it("漲潮會把格子變成淺灘再變成海,站在上面的人被推上岸", () => {
    let save = addShards(newSave("brave"), { mata: 6 });
    save = recruit(save, "mata");
    let s: BattleState = initFight(T1, save, 3);
    // 把巴度放在最西邊的沙灘
    const west = cellToHex([1, 4]);
    s = { ...s, units: s.units.map((u) => (u.id === "batu" ? { ...u, pos: west } : u)) };
    for (let i = 0; i < 2; i++) {
      s = battleReducer(s, { type: "END_TURN" });
      s = battleReducer(s, { type: "END_TURN" }); // 跳過敵方(只看地形)
    }
    expect(s.terrain[hexKey(west)]).toBe("sea");
    expect(hexKey(getUnit(s, "batu")!.pos)).not.toBe(hexKey(west));
  });

  it("全員登上珊瑚礁 = 勝利", () => {
    let save = addShards(newSave("brave"), { mata: 6 });
    save = recruit(save, "mata");
    let s = initFight(T1, save, 3);
    const goal = T1.objective.kind === "reach" ? T1.objective.cells : [];
    const heroes = living(s, "hero").filter((u) => u.isHero);
    s = { ...s, units: s.units.map((u) => { const i = heroes.findIndex((h) => h.id === u.id); return i >= 0 ? { ...u, pos: cellToHex(goal[i]) } : u; }) };
    s = battleReducer(s, { type: "WAIT", unitId: heroes[0].id });
    s = battleReducer(s, { type: "END_TURN" });
    expect(s.outcome).toBe("victory");
  });
});
