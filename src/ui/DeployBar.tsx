/**
 * 布陣列(開戰前)與相剋說明。
 *  - 點英雄、再點藍色格子:換位置(有人就互換)
 *  - 名冊比名額多時:點候補的人換上場(名額滿了就換掉目前選中的人)
 *  - 顯示敵方的戰型,提示該帶誰
 */
import { CTYPES, CTYPE_INFO, beats } from "../game/counters";
import { getHero } from "../game/heroes";
import { living, type BattleAction } from "../game/battle";
import type { BattleState, CombatType, Unit } from "../game/types";
import { portraitArt } from "./assets";

function TypeBadge({ t }: { t?: CombatType }) {
  if (!t) return null;
  const c = CTYPE_INFO[t];
  return (
    <span className="type-badge" style={{ background: c.color }} title={c.desc}>
      {c.icon}
      {c.name}
    </span>
  );
}

function Chip({ u, sel, onClick, extra }: { u: Unit; sel?: boolean; onClick: () => void; extra?: React.ReactNode }) {
  return (
    <button className={`hero-chip ${sel ? "sel" : ""}`} onClick={onClick} style={{ flex: "0 0 auto", minWidth: 120 }}>
      <img src={portraitArt(u.id)} alt="" />
      <span className="bars">
        <span style={{ fontWeight: 600 }}>
          {u.name} <TypeBadge t={u.ctype} />
        </span>
        <span style={{ opacity: 0.75, fontSize: 11 }}>
          Lv {u.level}・{getHero(u.defId).title.split("・")[0]}
        </span>
      </span>
      {extra}
    </button>
  );
}

export function DeployBar({ battle, selectedId, onSelect, onAction }: { battle: BattleState; selectedId: string | null; onSelect: (id: string | null) => void; onAction: (a: BattleAction) => void }) {
  const on = battle.units.filter((u) => u.isHero);
  const foes = living(battle, "enemy");
  const foeTypes = [...new Set(foes.map((f) => f.ctype).filter(Boolean))] as CombatType[];
  const counters = foeTypes.map((t) => CTYPES.find((c) => beats(c, t))!);
  const selectedOn = on.find((u) => u.id === selectedId);

  return (
    <div className="battle-bottom">
      <div className="row" style={{ gap: 6, marginBottom: 6, fontSize: 12.5, color: "var(--paper)" }}>
        <b style={{ fontFamily: "var(--font-ui)", fontSize: 15 }}>
          布陣 {on.length}/{battle.maxHeroes}
        </b>
        <span>
          敵方:
          {foeTypes.map((t) => (
            <TypeBadge key={t} t={t} />
          ))}
        </span>
        {counters.length > 0 && (
          <span>
            → 剋制牠們的是
            {[...new Set(counters)].map((t) => (
              <TypeBadge key={t} t={t} />
            ))}
          </span>
        )}
      </div>
      <div className="actions" style={{ marginBottom: 6 }}>
        {on.map((u) => (
          <Chip
            key={u.id}
            u={u}
            sel={u.id === selectedId}
            onClick={() => onSelect(u.id === selectedId ? null : u.id)}
            extra={
              on.length > 1 && battle.reserve.length > 0 ? (
                <span
                  role="button"
                  title="換下場"
                  style={{ marginLeft: 4, opacity: 0.8, fontSize: 14 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction({ type: "DEPLOY_OUT", unitId: u.id });
                    onSelect(null);
                  }}
                >
                  ✕
                </span>
              ) : null
            }
          />
        ))}
        {battle.reserve.map((u) => (
          <div key={u.id} style={{ opacity: 0.8, flex: "0 0 auto" }}>
            <Chip
              u={u}
              onClick={() => {
                if (on.length < battle.maxHeroes) onAction({ type: "DEPLOY_IN", heroId: u.id });
                else if (selectedOn) {
                  onAction({ type: "DEPLOY_IN", heroId: u.id, replace: selectedOn.id });
                  onSelect(u.id);
                }
              }}
              extra={<span style={{ fontSize: 11, marginLeft: 4 }}>候補</span>}
            />
          </div>
        ))}
      </div>
      <div className="row" style={{ flexWrap: "nowrap", gap: 8 }}>
        <div className="sub grow" style={{ fontSize: 12.5, color: "var(--paper)" }}>
          {selectedOn
            ? `點藍色格子移動${selectedOn.name}${battle.reserve.length && on.length >= battle.maxHeroes ? ",或點候補的人換上場" : ""}`
            : battle.reserve.length && on.length >= battle.maxHeroes
              ? "名額滿了:先點要換下的人,再點候補"
              : "點英雄,再點藍色格子調整站位"}
        </div>
        <button className="btn btn-primary" onClick={() => onAction({ type: "START" })} style={{ flex: "none" }}>
          開戰
        </button>
      </div>
    </div>
  );
}

/** 相剋說明:五型繞一圈的圖 */
export function CounterHelp({ onClose }: { onClose: () => void }) {
  const R = 90;
  const pos = CTYPES.map((_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return { x: 130 + R * Math.cos(a), y: 118 + R * Math.sin(a) };
  });
  return (
    <div className="modal" onClick={onClose}>
      <div className="paper fade-in" onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
        <div className="paper-title">相剋</div>
        <svg viewBox="0 0 260 236" style={{ width: "min(300px, 100%)" }}>
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0,0 L10,5 L0,10 Z" fill="#b5462e" />
            </marker>
          </defs>
          {pos.map((p, i) => {
            const q = pos[(i + 1) % 5];
            const dx = q.x - p.x;
            const dy = q.y - p.y;
            const len = Math.hypot(dx, dy);
            const k = 30 / len;
            return <line key={i} x1={p.x + dx * k} y1={p.y + dy * k} x2={q.x - dx * k} y2={q.y - dy * k} stroke="#b5462e" strokeWidth={3} markerEnd="url(#arr)" />;
          })}
          {CTYPES.map((t, i) => (
            <g key={t} transform={`translate(${pos[i].x},${pos[i].y})`}>
              <circle r={24} fill={CTYPE_INFO[t].color} stroke="#fff" strokeWidth={2} />
              <text textAnchor="middle" y={-2} fontSize={16}>
                {CTYPE_INFO[t].icon}
              </text>
              <text textAnchor="middle" y={15} fontSize={12} fill="#fff" fontWeight={700}>
                {CTYPE_INFO[t].name}
              </text>
            </g>
          ))}
        </svg>
        <div style={{ fontSize: 14, lineHeight: 1.8 }}>
          箭頭指向的是「被剋」的一方。
          <br />
          剋制對方:傷害 ×1.35 ;被對方剋:傷害 ×0.8
        </div>
        <div style={{ textAlign: "left", fontSize: 13, marginTop: 8 }}>
          {CTYPES.map((t) => (
            <div key={t}>
              <TypeBadge t={t} /> {CTYPE_INFO[t].desc}
            </div>
          ))}
        </div>
        <button className="btn btn-sm" style={{ marginTop: 10 }} onClick={onClose}>
          知道了
        </button>
      </div>
    </div>
  );
}

export { TypeBadge };
