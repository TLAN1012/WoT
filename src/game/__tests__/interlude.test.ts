import { describe, expect, it } from "vitest";
import { battleResult, getUnit, initBattle, living } from "../battle";
import { getChapter } from "../chapters";
import { rollMaterials } from "../materials";
import { addMaterials, canUpgrade, equip, grantKeepsake, heroCharmBonus, newSave, upgradeKeepsake } from "../progress";

const INTER = getChapter("inter1");

describe("間章試煉", () => {
  it("十二關、每關四人、試煉經驗 1/10", () => {
    expect(INTER.battles).toHaveLength(12);
    for (const b of INTER.battles) {
      expect(b.maxHeroes).toBe(4);
      expect(b.xpScale).toBe(0.1);
      expect(b.enemies.length).toBeGreaterThan(0);
    }
  });
  it("2★/3★ 敵人更多更強", () => {
    const b = INTER.battles[0];
    const s1 = initBattle(b, newSave("brave"), 1, 1);
    const s3 = initBattle(b, newSave("brave"), 1, 3);
    expect(living(s3, "enemy").length).toBe(living(s1, "enemy").length + 3);
    const e1 = living(s1, "enemy")[0];
    expect(getUnit(s3, e1.id)!.maxHp).toBeGreaterThan(e1.maxHp);
  });
  it("經驗打一折", () => {
    const s = initBattle(INTER.battles[0], newSave("brave"), 1, 1);
    const full = battleResult({ ...s, outcome: "victory" }, 8, 1);
    const tenth = battleResult({ ...s, outcome: "victory" }, 8, 0.1);
    expect(tenth.xp.batu).toBe(Math.round(full.xp.batu / 10));
  });
  it("材料:3★ 掉更多,黑曜石只在 3★", () => {
    let seed = 1;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    let o1 = 0, o3 = 0, t1 = 0, t3 = 0;
    for (let i = 0; i < 200; i++) {
      const a = rollMaterials("obsidian", 1, r);
      const c = rollMaterials("obsidian", 3, r);
      o1 += a.obsidian ?? 0;
      o3 += c.obsidian ?? 0;
      t1 += Object.values(a).reduce((n, x) => n + (x ?? 0), 0);
      t3 += Object.values(c).reduce((n, x) => n + (x ?? 0), 0);
    }
    expect(o1).toBe(0);
    expect(o3).toBeGreaterThan(50);
    expect(t3).toBeGreaterThan(t1);
  });
  it("信物升級:扣材料、升等、依位置給加成", () => {
    let s = grantKeepsake(newSave("brave"), "hyena-head");
    const uid = s.inventory[0].uid;
    expect(canUpgrade(s, uid)).toBe(false);
    s = addMaterials(s, { flint: 3 });
    s = upgradeKeepsake(s, uid);
    expect(s.inventory[0].level).toBe(2);
    expect(s.materials.flint).toBe(0);
    s = equip(s, "batu", "navel", uid);
    expect(heroCharmBonus(s, "batu").hp).toBeCloseTo(0.06);
    const plain = initBattle(INTER.battles[0], newSave("brave"), 1);
    const up = initBattle(INTER.battles[0], s, 1);
    expect(getUnit(up, "batu")!.maxHp).toBeGreaterThan(getUnit(plain, "batu")!.maxHp);
  });
});
