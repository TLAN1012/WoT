import { describe, expect, it } from "vitest";
import { hexKey } from "../../engine/hex";
import { runEnemyPhase } from "../ai";
import { battleReducer, battleResult, getUnit, initFight, living, previewSkill, reachable, skillTargets } from "../battle";
import { CHAPTERS } from "../chapters";
import { cellToHex, parseMap } from "../maps";
import { deriveStats, gainXp, heroSkills, newHero, newSave, resetPoints, spendPoint } from "../progress";
import { getSkill, skillArea } from "../skills";
import { getEnemy } from "../enemies";
import type { BattleState, Unit } from "../types";

const B1 = CHAPTERS[0].battles[0];

function place(s: BattleState, id: string, cell: [number, number]): BattleState {
  return { ...s, units: s.units.map((u) => (u.id === id ? { ...u, pos: cellToHex(cell) } : u)) };
}

describe("劇本", () => {
  for (const ch of CHAPTERS)
    for (const b of ch.battles)
      it(`${b.id} 地圖與配置合法`, () => {
        const t = parseMap(b.map);
        for (const u of [...b.heroes.map((h) => h.cell), ...b.enemies.map((e) => e.cell), ...(b.waves ?? []).flatMap((w) => w.units.map((u) => u.cell))]) {
          expect(t[hexKey(cellToHex(u))], `${b.id} ${u}`).toBeDefined();
        }
        for (const e of b.enemies) getEnemy(e.defId);
      });
});

describe("成長", () => {
  it("升級給 3 點、自動成長", () => {
    const p = newHero("batu");
    const { hero, levels } = gainXp(p, 230);
    expect(levels).toBe(2);
    expect(hero.level).toBe(3);
    expect(hero.xp).toBe(30);
    expect(hero.unspent).toBe(6);
    expect(deriveStats(hero).atk).toBeGreaterThan(deriveStats(p).atk);
    expect(heroSkills(hero)).toContain("roar");
  });
  it("分配與重置點數", () => {
    let p = { ...newHero("bitu"), unspent: 2 };
    p = spendPoint(spendPoint(p, "int"), "int");
    expect(p.bonus.int).toBe(2);
    expect(spendPoint(p, "int")).toBe(p);
    p = resetPoints(p);
    expect(p.unspent).toBe(2);
    expect(p.bonus.int).toBe(0);
  });
});

describe("技能形狀", () => {
  const o = { q: 0, r: 0 };
  it("直線只能朝六個方向", () => {
    const s = getSkill("frostline");
    expect(skillArea(s, o, { q: 2, r: 0 })).toHaveLength(3);
    expect(skillArea(s, o, { q: 2, r: -1 })).toHaveLength(0);
  });
  it("範圍爆炸半徑 1 = 7 格;旋風 = 6 格;弧斬 = 3 格", () => {
    expect(skillArea(getSkill("meteor"), o, { q: 3, r: 0 })).toHaveLength(7);
    expect(skillArea(getSkill("whirl"), o, o)).toHaveLength(6);
    expect(skillArea(getSkill("tusk"), o, { q: 1, r: 0 })).toHaveLength(3);
  });
});

describe("戰鬥", () => {
  it("移動受控制區限制;友軍可穿過不可停", () => {
    let s = initFight(B1, newSave("brave"), 1);
    const batu = getUnit(s, "batu")!;
    const r = reachable(s, batu);
    expect(r.get(hexKey(getUnit(s, "danum")!.pos))?.canStop ?? false).toBe(false);
    // 把鬣狗放到巴度前兩格:走進牠身邊就停
    s = place(s, "h1", [7, 4]);
    const r2 = reachable(s, getUnit(s, "batu")!);
    expect(r2.has(hexKey(cellToHex([8, 4])))).toBe(false);
  });

  it("出手、經驗、擊倒", () => {
    let s = initFight(B1, newSave("brave"), 1);
    s = place(s, "h1", [5, 4]);
    s = { ...s, units: s.units.map((u) => (u.id === "h1" ? { ...u, hp: 5 } : u)) };
    const target = getUnit(s, "h1")!.pos;
    expect(skillTargets(s, getUnit(s, "batu")!, "axe").map(hexKey)).toContain(hexKey(target));
    expect(previewSkill(s, getUnit(s, "batu")!, "axe", target)[0].lethal).toBe(true);
    s = battleReducer(s, { type: "SKILL", unitId: "batu", skillId: "axe", target });
    expect(getUnit(s, "h1")!.down).toBe(true);
    expect(s.xp.batu).toBeGreaterThan(8);
    expect(s.xp.bitu).toBeGreaterThan(0);
    expect(getUnit(s, "batu")!.acted).toBe(true);
    // 行動後不能再移動
    expect(battleReducer(s, { type: "MOVE", unitId: "batu", to: cellToHex([4, 5]) })).toBe(s);
  });

  it("怒氣不足不能放旋風斧;靈力每回合回復", () => {
    let s = initFight(B1, newSave("brave"), 1);
    s = { ...s, units: s.units.map((u) => (u.id === "batu" ? { ...u, res: 0 } : u.id === "bitu" ? { ...u, res: 0 } : u)) };
    expect(battleReducer(s, { type: "SKILL", unitId: "batu", skillId: "whirl", target: getUnit(s, "batu")!.pos })).toBe(s);
    s = battleReducer(s, { type: "END_TURN" });
    s = runEnemyPhase(s, battleReducer);
    expect(s.side).toBe("hero");
    expect(getUnit(s, "bitu")!.res).toBeGreaterThan(0);
  });

  it("暈眩讓英雄下一回合不能動", () => {
    let s = initFight(B1, newSave("brave"), 1);
    s = battleReducer(s, { type: "END_TURN" });
    // 敵方階段中被踐踏暈眩
    s = { ...s, units: s.units.map((u): Unit => (u.id === "bitu" ? { ...u, statuses: [{ id: "stun", turns: 1 }] } : u)) };
    s = runEnemyPhase(s, battleReducer);
    expect(getUnit(s, "bitu")!.acted).toBe(true);
    s = battleReducer(s, { type: "END_TURN" });
    s = runEnemyPhase(s, battleReducer);
    expect(getUnit(s, "bitu")!.acted).toBe(false);
  });

  it("圖騰會治療相鄰同伴並在 3 回合後消散", () => {
    let s = initFight(B1, newSave("brave"), 1);
    s = { ...s, units: s.units.map((u) => (u.id === "danum" ? { ...u, skills: [...u.skills, "totem"] } : u.id === "batu" ? { ...u, hp: 20 } : u)) };
    const spot = cellToHex([3, 4]);
    s = battleReducer(s, { type: "SKILL", unitId: "danum", skillId: "totem", target: spot });
    expect(living(s, "hero").some((u) => u.defId === "totem")).toBe(true);
    for (let i = 0; i < 3; i++) {
      s = battleReducer(s, { type: "END_TURN" });
      s = runEnemyPhase(s, battleReducer);
    }
    expect(living(s, "hero").some((u) => u.defId === "totem")).toBe(false);
  });

  it("全滅敵人 = 勝利,結算給經驗", () => {
    let s = initFight(B1, newSave("brave"), 1);
    s = { ...s, waves: [], units: s.units.map((u) => (u.side === "enemy" && u.id !== "h1" ? { ...u, down: true } : u.id === "h1" ? { ...u, hp: 1, pos: cellToHex([5, 4]) } : u)) };
    s = battleReducer(s, { type: "SKILL", unitId: "batu", skillId: "axe", target: cellToHex([5, 4]) });
    expect(s.outcome).toBe("victory");
    const r = battleResult(s, B1.parTurns);
    expect(r.stars).toBe(3);
    expect(r.xp.danum).toBeGreaterThan(0);
  });
});
