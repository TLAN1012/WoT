/** 自動對打(平衡測試用):模擬玩家與野獸都用效用 AI。 */
import { planActions, planEnemy, nextHero, runAllySummons, runEnemyPhase } from "./ai";
import { battleReducer, getUnit, initFight } from "./battle";
import type { BattleDef, BattleState, SaveState } from "./types";

export function simulate(def: BattleDef, save: SaveState, seed: number): BattleState {
  let s = initFight(def, save, seed);
  let guard = 0;
  while (s.outcome === "ongoing" && guard++ < 400) {
    if (s.side === "enemy") {
      s = runEnemyPhase(s, battleReducer);
      continue;
    }
    const h = nextHero(s);
    if (!h) {
      s = battleReducer(runAllySummons(s, battleReducer), { type: "END_TURN" });
      continue;
    }
    for (const a of planActions(planEnemy(s, h))) s = battleReducer(s, a);
    const after = getUnit(s, h.id);
    if (after && !after.down && !after.acted) s = battleReducer(s, { type: "WAIT", unitId: h.id });
  }
  return s;
}
