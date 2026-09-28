/** 戰後結算:星數、經驗、升級 */
import { XP_PER_LEVEL } from "../game/classes";
import { MATERIALS } from "../game/materials";
import type { MaterialId } from "../game/types";
import { getHero } from "../game/heroes";
import type { BattleResult } from "../game/battle";
import type { HeroProgress } from "../game/types";
import { keepsakeArt, portraitArt, storyArt } from "./assets";
import { KeepsakeCard } from "./KeepsakeCard";

export interface HeroGain {
  before: HeroProgress;
  after: HeroProgress;
  xp: number;
}

export function ResultScreen(props: {
  title: string;
  result: BattleResult;
  gains: HeroGain[];
  parTurns: number;
  /** 這次新得到的信物(首勝獎勵 + 掉落) */
  rewards: string[];
  /** 這次撿到的足跡 */
  shards: Record<string, number>;
  shardTotals: Record<string, number>;
  materials: Partial<Record<MaterialId, number>>;
  /** 試煉難度(劇情關為 0) */
  tier: number;
  winArt: string;
  onNext: () => void;
  onRetry: () => void;
}) {
  const { result } = props;
  return (
    <div className="result">
      <div className="screen-bg" style={{ backgroundImage: `url(${storyArt(result.victory ? props.winArt : "defeat")})` }} />
      <div className="paper fade-in" style={{ position: "relative" }}>
        <div className="row">
          <div className="grow">
            <div className="sub">{props.title}</div>
            <div style={{ fontFamily: "var(--font-ui)", fontWeight: 600, fontSize: 30, color: result.victory ? "var(--good)" : "var(--ochre)" }}>
              {result.victory ? "勝利" : "撤退"}
            </div>
          </div>
          {result.victory && <div className="stars" style={{ fontSize: 30 }}>{"★".repeat(result.stars)}{"☆".repeat(3 - result.stars)}</div>}
        </div>
        {result.victory && props.tier > 0 && <div className="sub" style={{ fontSize: 12.5 }}>通過 {props.tier}★ 試煉(試煉的經驗只有 1/10,但會掉材料)</div>}
        {result.victory && props.tier === 0 && (
          <div className="sub" style={{ fontSize: 12.5 }}>
            ★ 勝利  {result.fallen.length === 0 ? "★" : "☆"} 沒有人倒下  {result.turns <= props.parTurns ? "★" : "☆"} {props.parTurns} 回合內({result.turns} 回合)
          </div>
        )}
        {!result.victory && <div style={{ fontSize: 14, marginTop: 6 }}>別灰心。這一戰的經驗保留一半,升級、分配點數之後再試一次。</div>}
        <div className="divider" />
        <div className="grid" style={{ gap: 10 }}>
          {props.gains.map((g) => {
            const h = getHero(g.after.id);
            const up = g.after.level - g.before.level;
            return (
              <div key={h.id} className="row" style={{ gap: 10, flexWrap: "nowrap" }}>
                <img src={portraitArt(h.id)} alt="" style={{ width: 44, height: 44, objectFit: "cover", objectPosition: "top", borderRadius: "50%", border: "2px solid var(--bark)", background: "#cfd9d0" }} />
                <div className="grow">
                  <div className="row" style={{ gap: 6 }}>
                    <b style={{ fontFamily: "var(--font-ui)" }}>{h.name}</b>
                    <span className="sub">Lv {g.after.level}</span>
                    <span className="sub">+{g.xp} 經驗</span>
                    {up > 0 && <span className="level-up">升級!+{up * 3} 點</span>}
                  </div>
                  <div className="bar xp">
                    <i style={{ width: `${(g.after.xp / XP_PER_LEVEL) * 100}%` }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {Object.keys(props.materials).length > 0 && (
          <>
            <div className="divider" />
            <div className="paper-title">撿到材料</div>
            <div className="row" style={{ gap: 14 }}>
              {Object.entries(props.materials).map(([m, n]) => (
                <div key={m} className="reward row" style={{ gap: 4, fontSize: 15 }}>
                  <img src={keepsakeArt(`mat-${m}`)} alt="" style={{ width: 44, height: 44, objectFit: "contain" }} />
                  {MATERIALS[m as MaterialId].name} ×{n}
                </div>
              ))}
            </div>
            <div className="sub" style={{ fontSize: 12.5, marginTop: 6 }}>材料可以在「同伴」畫面的信物工坊升級信物。</div>
          </>
        )}
        {Object.keys(props.shards).length > 0 && (
          <>
            <div className="divider" />
            <div className="paper-title">撿到足跡</div>
            {Object.entries(props.shards).map(([id, n]) => {
              const h = getHero(id);
              return (
                <div key={id} className="row reward" style={{ gap: 8, fontSize: 14 }}>
                  <img src={keepsakeArt(`shard-${id}`)} alt="" style={{ width: 40, height: 40, objectFit: "contain" }} />
                  <span>
                    {h.name}的{h.recruit?.shard} ×{n}
                  </span>
                  <span className="sub">
                    ({Math.min(props.shardTotals[id] ?? 0, h.recruit?.need ?? 0)}/{h.recruit?.need})
                  </span>
                  {(props.shardTotals[id] ?? 0) >= (h.recruit?.need ?? 99) && <span className="level-up">可以招募了!</span>}
                </div>
              );
            })}
          </>
        )}
        {props.rewards.length > 0 && (
          <>
            <div className="divider" />
            <div className="paper-title">獲得信物</div>
            <div className="grid" style={{ gap: 14 }}>
              {props.rewards.map((id, i) => (
                <div key={i} className="reward" style={{ animationDelay: `${0.3 + i * 0.25}s`, animationFillMode: "backwards" }}>
                  <KeepsakeCard id={id} />
                </div>
              ))}
            </div>
            <div className="sub" style={{ marginTop: 8, fontSize: 12.5 }}>到「同伴」畫面,把信物戴在額頭、胸前或肚臍——位置不同,力量也不同。</div>
          </>
        )}
        <div className="row" style={{ marginTop: 16, justifyContent: "flex-end" }}>
          {!result.victory && (
            <button className="btn" onClick={props.onRetry}>
              再戰一次
            </button>
          )}
          <button className="btn btn-primary" onClick={props.onNext}>
            {result.victory ? "繼續" : "回到地圖"}
          </button>
        </div>
      </div>
    </div>
  );
}
