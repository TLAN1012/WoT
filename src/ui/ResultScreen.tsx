/** 戰後結算:星數、經驗、升級 */
import { XP_PER_LEVEL } from "../game/classes";
import { getHero } from "../game/heroes";
import type { BattleResult } from "../game/battle";
import type { HeroProgress } from "../game/types";
import { portraitArt, storyArt } from "./assets";

export interface HeroGain {
  before: HeroProgress;
  after: HeroProgress;
  xp: number;
}

export function ResultScreen(props: { title: string; result: BattleResult; gains: HeroGain[]; parTurns: number; onNext: () => void; onRetry: () => void }) {
  const { result } = props;
  return (
    <div className="result">
      <div className="screen-bg" style={{ backgroundImage: `url(${storyArt(result.victory ? "victory" : "defeat")})` }} />
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
        {result.victory && (
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
