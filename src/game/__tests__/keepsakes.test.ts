import { describe, expect, it } from "vitest";
import { battleReducer, battleResult, getUnit, initBattle } from "../battle";
import { CHAPTERS } from "../chapters";
import { KEEPSAKES } from "../keepsakes";
import { cellToHex } from "../maps";
import { equip, grantKeepsake, heroCharms, newSave, wearer } from "../progress";
import type { BattleState, CharmEffect } from "../types";

const B1 = CHAPTERS[0].battles[0];

function withCharm(s: BattleState, id: string, c: CharmEffect): BattleState {
  return { ...s, units: s.units.map((u) => (u.id === id ? { ...u, charms: [...u.charms, c] } : u)) };
}
function near(s: BattleState): BattleState {
  return { ...s, waves: [], units: s.units.map((u) => (u.id === "h1" ? { ...u, pos: cellToHex([5, 4]) } : u)) };
}

describe("信物", () => {
  it("每件信物三個位置都有效果;每場關卡都有獎勵", () => {
    for (const k of KEEPSAKES) expect(Object.keys(k.effects)).toEqual(["brow", "chest", "navel"]);
    for (const b of CHAPTERS[0].battles) expect(KEEPSAKES.some((k) => k.id === b.reward)).toBe(true);
  });

  it("配戴、移轉、取下", () => {
    let s = grantKeepsake(newSave("brave"), "hyena-head");
    const uid = s.inventory[0].uid;
    s = equip(s, "batu", "brow", uid);
    expect(heroCharms(s, "batu")).toEqual(["sureCrit"]);
    s = equip(s, "danum", "navel", uid);
    expect(heroCharms(s, "batu")).toEqual([]);
    expect(heroCharms(s, "danum")).toEqual(["reviveOnce"]);
    expect(wearer(s, uid)).toEqual({ heroId: "danum", slot: "navel" });
    s = equip(s, "danum", "navel", null);
    expect(wearer(s, uid)).toBeNull();
  });

  it("額・鬣狗之首:第一擊必定暴擊,只一次", () => {
    let s = near(withCharm(initBattle(B1, newSave("brave"), 1), "batu", "sureCrit"));
    s = battleReducer(s, { type: "SKILL", unitId: "batu", skillId: "axe", target: cellToHex([5, 4]) });
    expect(s.log.some((e) => e.kind === "hit" && e.crit)).toBe(true);
    expect(getUnit(s, "batu")!.charmUsed).toContain("sureCrit");
  });

  it("臍・鬣狗之首:倒下時以 5% 生命站起來", () => {
    let s = near(withCharm(initBattle(B1, newSave("brave"), 1), "bitu", "reviveOnce"));
    s = { ...s, units: s.units.map((u) => (u.id === "bitu" ? { ...u, hp: 1, pos: cellToHex([4, 4]) } : u.id === "batu" ? { ...u, pos: cellToHex([1, 1]) } : u)) };
    s = { ...s, side: "enemy" };
    s = battleReducer(s, { type: "SKILL", unitId: "h1", skillId: "bite", target: cellToHex([4, 4]) });
    const bitu = getUnit(s, "bitu")!;
    expect(bitu.down).toBeFalsy();
    expect(bitu.hp).toBe(Math.ceil(bitu.maxHp * 0.05));
  });

  it("額・六角石片:第一次施放不耗資源", () => {
    let s = near(withCharm(initBattle(B1, newSave("brave"), 1), "batu", "freeCastOnce"));
    s = { ...s, units: s.units.map((u) => (u.id === "batu" ? { ...u, res: 40 } : u)) };
    s = battleReducer(s, { type: "SKILL", unitId: "batu", skillId: "whirl", target: getUnit(s, "batu")!.pos });
    expect(getUnit(s, "batu")!.res).toBeGreaterThanOrEqual(40);
  });

  it("胸・古象神的祝福:不會被暈眩", () => {
    let s = withCharm(initBattle(B1, newSave("brave"), 1), "batu", "noCC");
    s = { ...s, units: s.units.map((u) => (u.id === "h1" ? { ...u, skills: ["stomp"], pos: cellToHex([5, 4]) } : u)), side: "enemy" };
    s = battleReducer(s, { type: "SKILL", unitId: "h1", skillId: "stomp", target: cellToHex([5, 4]) });
    expect(getUnit(s, "batu")!.statuses.some((x) => x.id === "stun")).toBe(false);
  });

  it("配戴的效果會帶進戰鬥;掉落勝利才帶走", () => {
    let save = grantKeepsake(newSave("brave"), "elephant-blessing");
    save = equip(save, "batu", "navel", save.inventory[0].uid);
    const s = initBattle(B1, save, 1);
    const plain = initBattle(B1, newSave("brave"), 1);
    expect(getUnit(s, "batu")!.maxHp).toBeGreaterThan(getUnit(plain, "batu")!.maxHp);
    const lost = battleResult({ ...s, drops: ["tiger-claw"], outcome: "defeat" }, 7);
    expect(lost.drops).toEqual([]);
    const won = battleResult({ ...s, drops: ["tiger-claw"], outcome: "victory" }, 7);
    expect(won.drops).toEqual(["tiger-claw"]);
  });
});
