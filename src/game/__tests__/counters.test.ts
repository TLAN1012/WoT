import { describe, expect, it } from "vitest";
import { runAllySummons } from "../ai";
import { battleReducer, battleResult, computeDamage, getUnit, initBattle, initFight, living, reachable } from "../battle";
import { CHAPTERS } from "../chapters";
import { beats, counterMultiplier, CTYPES } from "../counters";
import { cellToHex } from "../maps";
import { addShards, canRecruit, newSave, recruit } from "../progress";
import { getSkill } from "../skills";
import type { BattleState, SaveState } from "../types";

const [B1, B2] = CHAPTERS[0].battles;

function withAll(): SaveState {
  let s = addShards(newSave("brave"), { mata: 6, kasiw: 6, bulan: 6 });
  for (const id of ["mata", "kasiw", "bulan"]) s = recruit(s, id);
  return s;
}
function put(s: BattleState, id: string, cell: [number, number], extra = {}): BattleState {
  return { ...s, units: s.units.map((u) => (u.id === id ? { ...u, pos: cellToHex(cell), ...extra } : u)) };
}

describe("相剋", () => {
  it("五型一圈:每型剋下一型、被上一型剋", () => {
    for (let i = 0; i < 5; i++) {
      expect(beats(CTYPES[i], CTYPES[(i + 1) % 5])).toBe(true);
      expect(beats(CTYPES[(i + 1) % 5], CTYPES[i])).toBe(false);
    }
    expect(counterMultiplier("axe", "beast")).toBeGreaterThan(1);
    expect(counterMultiplier("beast", "axe")).toBeLessThan(1);
    expect(counterMultiplier("axe", "bow")).toBe(1);
  });
  it("巴度(斧)打鬣狗(獸)比打寒祟(靈)痛", () => {
    const s = initFight(B1, newSave("brave"), 1);
    const batu = getUnit(s, "batu")!;
    const hy = getUnit(s, "h1")!;
    const axe = getSkill("axe");
    const wisp = { ...hy, ctype: "spirit" as const };
    expect(computeDamage(s, batu, hy, axe)).toBeGreaterThan(computeDamage(s, batu, wisp, axe));
  });
});

describe("布陣", () => {
  it("布陣時只能在出發區互換、換人、出陣;開戰後才能行動", () => {
    let s = initBattle(B2, withAll(), 1);
    expect(s.phase).toBe("deploy");
    expect(s.units.filter((u) => u.isHero)).toHaveLength(4);
    expect(s.reserve).toHaveLength(2);
    const batuPos = getUnit(s, "batu")!.pos;
    const danumPos = getUnit(s, "danum")!.pos;
    s = battleReducer(s, { type: "DEPLOY_MOVE", unitId: "batu", to: danumPos });
    expect(getUnit(s, "danum")!.pos).toEqual(batuPos);
    // 出發區外不行
    expect(battleReducer(s, { type: "DEPLOY_MOVE", unitId: "batu", to: cellToHex([0, 0]) })).toBe(s);
    const benched = s.reserve[0].id;
    s = battleReducer(s, { type: "DEPLOY_IN", heroId: benched, replace: "bitu" });
    expect(getUnit(s, benched)).toBeDefined();
    expect(s.reserve.some((r) => r.id === "bitu")).toBe(true);
    // 開戰前不能出手
    expect(battleReducer(s, { type: "END_TURN" })).toBe(s);
    s = battleReducer(s, { type: "START" });
    expect(s.phase).toBe("fight");
    // 候補的人勝利時拿一半的勝利經驗
    const r = battleResult({ ...s, outcome: "victory" }, 6);
    expect(r.xp.bitu).toBe(20);
  });
});

describe("招募", () => {
  it("集滿足跡才能招募,以同伴平均等級加入", () => {
    let s = newSave("brave");
    s = { ...s, heroes: { ...s.heroes, batu: { ...s.heroes.batu, level: 3 }, danum: { ...s.heroes.danum, level: 3 }, bitu: { ...s.heroes.bitu, level: 3 } } };
    s = addShards(s, { mata: 5 });
    expect(canRecruit(s, "mata")).toBe(false);
    s = addShards(s, { mata: 1 });
    s = recruit(s, "mata");
    expect(s.party).toContain("mata");
    expect(s.heroes.mata.level).toBe(3);
    expect(s.heroes.mata.unspent).toBe(6);
  });
});

describe("新技能", () => {
  it("釘足箭:目標不能移動;安魂解除", () => {
    let s = initFight(B2, withAll(), 1);
    s = put(s, "h1", [7, 4]);
    s = put(s, "mata", [4, 4]);
    s = { ...s, units: s.units.map((u) => (u.id === "mata" ? { ...u, skills: [...u.skills, "pin"], res: 100 } : u)) };
    s = battleReducer(s, { type: "SKILL", unitId: "mata", skillId: "pin", target: cellToHex([7, 4]) });
    const h1 = getUnit(s, "h1")!;
    expect(h1.statuses.some((x) => x.id === "root")).toBe(true);
    expect(reachable({ ...s, side: "enemy" }, h1).size).toBe(1);
  });
  it("靈鹿召喚後會自己行動,3 回合後消散", () => {
    let s = initBattle(B2, withAll(), 1);
    s = battleReducer(s, { type: "DEPLOY_IN", heroId: "bulan", replace: "mata" });
    s = battleReducer(s, { type: "START" });
    s = { ...s, units: s.units.map((u) => (u.id === "bulan" ? { ...u, skills: [...u.skills, "spiritdeer"] } : u)) };
    const b = getUnit(s, "bulan")!;
    const spot = cellToHex([5, 5]);
    expect(b).toBeDefined();
    s = battleReducer(s, { type: "SKILL", unitId: "bulan", skillId: "spiritdeer", target: spot });
    expect(living(s, "hero").some((u) => u.defId === "spirit-deer")).toBe(true);
    const before = s.log.length;
    s = runAllySummons(s, battleReducer);
    expect(s.log.length).toBeGreaterThanOrEqual(before);
    for (let i = 0; i < 3; i++) {
      s = battleReducer(s, { type: "END_TURN" });
      s = { ...s, side: "enemy" };
      s = battleReducer(s, { type: "END_TURN" });
    }
    expect(living(s, "hero").some((u) => u.defId === "spirit-deer")).toBe(false);
  });
});
